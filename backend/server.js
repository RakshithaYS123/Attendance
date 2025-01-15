const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect('mongodb://localhost:27017/daily-report-system')

// Models
const User = mongoose.model('User', {
  email: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
})

const Task = mongoose.model('Task', {
  title: String,
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  comments: [{
    text: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body
  if (!email.endsWith('@ivislabs.com')) {
    return res.status(400).json({ error: 'Invalid email domain' })
  }

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({ 
      email, 
      role: email.includes('leader') ? 'team-leader' : 'team-member' 
    })
  }

  res.json({ user })
})

// Task routes
app.get('/api/tasks', async (req, res) => {
  const { userId } = req.query
  let query = {}
  
  const user = await User.findById(userId)
  if (user.role !== 'team-leader') {
    query.assignedTo = userId
  }

  const tasks = await Task.find(query)
    .populate('assignedTo')
    .populate('createdBy')
    .populate('comments.createdBy')
    .sort('-createdAt')
  res.json(tasks)
})

app.post('/api/tasks', async (req, res) => {
  const task = await Task.create({
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  res.json(task)
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' })
  }
})

app.patch('/api/tasks/:id', async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { 
      ...req.body,
      updatedAt: new Date()
    },
    { new: true }
  )
  res.json(task)
})

// Add comment endpoint
app.post('/api/tasks/:id/comments', async (req, res) => {
  const { text, userId } = req.body
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { 
      $push: { 
        comments: { 
          text, 
          createdBy: userId,
          createdAt: new Date()
        } 
      },
      updatedAt: new Date()
    },
    { new: true }
  ).populate('comments.createdBy')
  
  res.json(task)
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
