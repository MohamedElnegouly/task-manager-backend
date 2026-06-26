require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { getDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'task_manager_secret_key';

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

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const db = await getDb();
    const usersCol = db.collection('users');
    if (await usersCol.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const user = { _id: randomUUID(), name, email, password, phone: phone || '' };
    await usersCol.insertOne(user);
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'success',
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    const user = await db.collection('users').findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'success',
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const projects = await db.collection('projects').find().toArray();
    res.json({ projects });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.collection('tasks').find({ projectId: req.params.projectId }).toArray();
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, priority } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });
    const task = {
      _id: randomUUID(),
      projectId: req.params.projectId,
      title,
      status: 'Pending',
      priority: priority || 'Medium',
    };
    const db = await getDb();
    await db.collection('tasks').insertOne(task);
    res.status(201).json({ task });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.patch('/api/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const tasksCol = db.collection('tasks');
    const existing = await tasksCol.findOne({ _id: req.params.taskId });
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    const update = {};
    if (req.body.status) update.status = req.body.status;
    if (req.body.priority) update.priority = req.body.priority;
    await tasksCol.updateOne({ _id: req.params.taskId }, { $set: update });

    res.json({ task: { ...existing, ...update } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Task Manager API running on port ${PORT}`));
}

module.exports = app;
