import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { pool } from "./db";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { projectsRouter } from "./routes/projects";
import { tasksRouter } from "./routes/tasks";
import { hashPassword, verifyPassword } from "./security";

const client = await pool.connect();
const originalQuery = pool.query;
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api/`;
let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
try {
  await client.query("BEGIN");
  pool.query = client.query.bind(client) as any;
  const id = randomUUID();
  const email = `qa-${id}@example.test`;
  await client.query(
    "INSERT INTO users (id,email,full_name,role,password_hash) VALUES ($1,$2,'QA Admin','admin',$3)",
    [id, email, hashPassword("Admin123$")],
  );
  const call = async (
    path: string,
    body?: unknown,
    cookie = "",
    method = "POST",
  ) =>
    fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const login = await call("auth/login", { email, password: "Admin123$" });
  assert.equal(login.status, 200);
  const admin = login.headers.get("set-cookie")!.split(";")[0];
  assert.ok(login.headers.get("set-cookie")!.includes("HttpOnly"));
  const signup = await call("auth/register", {
    email: `member-${email}`,
    fullName: "QA Member",
    password: "Member123$",
    department: "QA",
    role: "admin",
  });
  assert.equal(signup.status, 200);
  const member = signup.headers.get("set-cookie")!.split(";")[0];
  const user = (await signup.json()).user;
  assert.equal(user.role, "collaborator");
  const record = await client.query(
    "SELECT password_hash FROM users WHERE id=$1",
    [user.id],
  );
  assert.notEqual(record.rows[0].password_hash, "Member123$");
  assert.ok(verifyPassword("Member123$", record.rows[0].password_hash));
  assert.equal(
    (await call(`users/${user.id}/role`, { role: "admin" }, "", "PUT")).status,
    401,
  );
  assert.equal(
    (await call(`users/${id}/role`, { role: "collaborator" }, member, "PUT"))
      .status,
    403,
  );
  assert.equal((await call("projects", {}, member)).status, 403);
  assert.equal(
    (await call("auth/google", { email, name: "Fake", credential: "fake" }))
      .status >= 400,
    true,
  );

  const projectId = randomUUID(), boardId = randomUUID(), taskId = randomUUID();
  await client.query("INSERT INTO projects (id,key,name,created_by) VALUES ($1,$2,'QA Project',$3)", [projectId, id.slice(0,8),id]);
  await client.query("INSERT INTO boards (id,project_id,name) VALUES ($1,$2,'QA Board')", [boardId,projectId]);
  await client.query("INSERT INTO tasks (id,project_id,board_id,title,start_date,due_date) VALUES ($1,$2,$3,'QA Task',CURRENT_DATE,CURRENT_DATE)", [taskId,projectId,boardId]);
  assert.equal((await call('projects/'+projectId+'/status',{status:'inactive'},'', 'PUT')).status,401);
  assert.equal((await call('projects/'+projectId+'/status',{status:'inactive'},member, 'PUT')).status,403);
  assert.equal((await call('projects/'+projectId+'/status',{status:'unknown'},admin, 'PUT')).status,400);
  assert.equal((await call('projects/'+projectId+'/status',{status:'inactive'},admin, 'PUT')).status,200);
  assert.equal((await client.query('SELECT status FROM projects WHERE id=$1',[projectId])).rows[0].status,'inactive');
  assert.equal((await client.query('SELECT id FROM tasks WHERE id=$1',[taskId])).rowCount,1);
  assert.equal((await client.query('SELECT id FROM boards WHERE id=$1',[boardId])).rowCount,1);
  const projects = await (await call('projects',undefined,admin,'GET')).json();
  assert.ok(!projects.some((p: any)=>p.id===projectId));
  assert.equal((await call('projects/'+projectId+'/boards',{name:'Blocked'},admin)).status,409);
  assert.equal((await call('tasks/'+taskId,{status:'in_progress'},member,'PUT')).status,409);
  assert.equal((await call('tasks',{projectId,boardId,title:'Blocked'},member)).status,409);
  const tasks = await (await call('tasks?boardId='+boardId,undefined,member,'GET')).json();
  assert.deepEqual(tasks,[]);
  assert.equal((await call('projects/inactive',undefined,'','GET')).status,401);
  assert.equal((await call('projects/inactive',undefined,member,'GET')).status,403);
  const inactive = await (await call('projects/inactive',undefined,admin,'GET')).json();
  assert.ok(inactive.some((p: any) => p.id === projectId));
  assert.equal((await call('projects/'+projectId+'/status',{status:'active'},member,'PUT')).status,403);
  assert.equal((await call('projects/'+projectId+'/status',{status:'active'},admin,'PUT')).status,200);
  assert.equal((await client.query('SELECT status FROM projects WHERE id=$1',[projectId])).rows[0].status,'active');
  const restored = await (await call('projects',undefined,member,'GET')).json();
  assert.ok(restored.some((p: any) => p.id === projectId && p.boards.some((b: any) => b.id === boardId)));
  const restoredTasks = await (await call('tasks?boardId='+boardId,undefined,member,'GET')).json();
  assert.ok(restoredTasks.some((t: any) => t.id === taskId));
  const remaining = await (await call('projects/inactive',undefined,admin,'GET')).json();
  assert.ok(!remaining.some((p: any) => p.id === projectId));
  assert.equal((await call('projects/'+projectId+'/boards',{name:'Restored board'},admin)).status,201);
  console.log('PASS: listado privado de inactivos y reactivación exclusiva del administrador con tareas y tableros restaurados.');
  console.log('PASS: inactivación exclusiva de administrador, persistencia, conservación de datos y bloqueo de proyectos inactivos.');
  const stream = await call("auth/events", undefined, member, "GET");
  assert.equal(stream.status, 200);
  reader = stream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const until = async (match: (s: string) => boolean) => {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const next = await Promise.race([
        reader!.read(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SSE timeout")), 6500),
        ),
      ]);
      buffer += decoder.decode(next.value);
      if (match(buffer)) return;
    }
    throw new Error("SSE update missing");
  };
  await until((s) => s.includes("data:"));
  buffer = "";
  assert.equal(
    (await call(`users/${user.id}/role`, { role: "admin" }, admin, "PUT"))
      .status,
    200,
  );
  assert.equal(
    (await client.query("SELECT role FROM users WHERE id=$1", [user.id]))
      .rows[0].role,
    "admin",
  );
  await until(
    (s) =>
      s.includes('"user":{"id":"' + user.id + '"') &&
      s.includes('"role":"admin"'),
  );
  await client.query("UPDATE users SET role='collaborator' WHERE id=$1", [
    user.id,
  ]);
  assert.equal(
    (await call(`users/${id}/role`, { role: "collaborator" }, member, "PUT"))
      .status,
    403,
  );
  buffer = "";
  await until((s) => s.includes('"role":"collaborator"'));
  await client.query("UPDATE users SET status='inactive' WHERE id=$1", [
    user.id,
  ]);
  buffer = "";
  await until((s) => s.includes("event: revoked"));
  assert.equal((await call("auth/me", undefined, member, "GET")).status, 401);
  console.log(
    "PASS: registro colaborador, hash, sesión, autorización, persistencia PostgreSQL, SSE, cambios directos BD y desactivación.",
  );
} finally {
  await reader?.cancel();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  pool.query = originalQuery;
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
