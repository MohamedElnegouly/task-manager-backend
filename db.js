const { MongoClient } = require('mongodb');

let cachedDb = null;
let seedPromise = null;

const SEED_PROJECTS = [
  { _id: '1', title: 'Mobile App Redesign', description: 'Revamp the UI/UX of the mobile app', status: 'Active' },
  { _id: '2', title: 'Backend Migration', description: 'Migrate backend services to the new infrastructure', status: 'On Hold' },
  { _id: '3', title: 'Marketing Website', description: 'Build the new marketing website', status: 'Completed' },
];

const SEED_TASKS = [
  { _id: 't1', projectId: '1', title: 'Design login screen', status: 'Done', priority: 'High' },
  { _id: 't2', projectId: '1', title: 'Implement project list', status: 'In Progress', priority: 'High' },
  { _id: 't3', projectId: '1', title: 'Write unit tests', status: 'Pending', priority: 'Medium' },
  { _id: 't4', projectId: '2', title: 'Set up CI/CD pipeline', status: 'In Progress', priority: 'High' },
  { _id: 't5', projectId: '3', title: 'Draft homepage copy', status: 'Pending', priority: 'Low' },
];

// Caches the connection and the one-time seed check across warm serverless
// invocations, so a cold start doesn't reseed or reconnect on every request.
async function getDb() {
  if (!cachedDb) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');
    const client = new MongoClient(uri);
    await client.connect();
    cachedDb = client.db('task_manager');
  }

  if (!seedPromise) {
    seedPromise = (async () => {
      const projectsCol = cachedDb.collection('projects');
      const count = await projectsCol.countDocuments();
      if (count === 0) {
        await projectsCol.insertMany(SEED_PROJECTS);
        await cachedDb.collection('tasks').insertMany(SEED_TASKS);
      }
    })();
  }
  await seedPromise;

  return cachedDb;
}

module.exports = { getDb };
