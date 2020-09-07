import express from 'express'
import routes from './../../routes.json'

// Import more routes here
import main from './main'

export const appRouter = express.Router()

// Don't forget to activate route
appRouter.get(routes.express.main, main)
