const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'task_manager_secret_key';

const users = []; // { id, name, email, password, phone }

let projects = [
  { _id: '1', title: 'Mobile App Redesign', description: 'Revamp the UI/UX of the mobile app', status: 'Active' },
  { _id: '2', title: 'Backend Migration', description: 'Migrate backend services to the new infrastructure', status: 'On Hold' },
  { _id: '3', title: 'Marketing Website', description: 'Build the new marketing website', status: 'Completed' },
];

let tasks = [
  { _id: 't1', projectId: '1', title: 'Design login screen', status: 'Done', priority: 'High' },
  { _id: 't2', projectId: '1', title: 'Implement project list', status: 'In Progress', priority: 'High' },
  { _id: 't3', projectId: '1', title: 'Write unit tests', status: 'Pending', priority: 'Medium' },
  { _id: 't4', projectId: '2', title: 'Set up CI/CD pipeline', status: 'In Progress', priority: 'High' },
  { _id: 't5', projectId: '3', title: 'Draft homepage copy', status: 'Pending', priority: 'Low' },
];

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const user = { id: randomUUID(), name, email, password, phone: phone || '' };
  users.push(user);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    message: 'success',
    token,
    user: { _id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
});

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    message: 'success',
    token,
    user: { _id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
});

app.get('/api/projects', authMiddleware, (req, res) => {
  res.json({ projects });
});

app.get('/api/projects/:projectId/tasks', authMiddleware, (req, res) => {
  res.json({ tasks: tasks.filter((t) => t.projectId === req.params.projectId) });
});

app.post('/api/projects/:projectId/tasks', authMiddleware, (req, res) => {
  const { title, priority } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });
  const task = {
    _id: randomUUID(),
    projectId: req.params.projectId,
    title,
    status: 'Pending',
    priority: priority || 'Medium',
  };
  tasks.push(task);
  res.status(201).json({ task });
});

app.patch('/api/tasks/:taskId', authMiddleware, (req, res) => {
  const task = tasks.find((t) => t._id === req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (req.body.status) task.status = req.body.status;
  if (req.body.priority) task.priority = req.body.priority;
  res.json({ task });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Task Manager API running on port ${PORT}`));
