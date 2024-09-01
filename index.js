require('dotenv').config();
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const typeDefs = require('./src/graphql/schemas/typeDefs');
const resolvers = require('./src/graphql/resolvers');
const jwt = require('jsonwebtoken');

const port = process.env.PORT;

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const getUserFromToken = (token) => {
    try {
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded.userId;
        }
        return null;
    } catch (err) {
        return null;
    }
};

// Create an Express application
const app = express();

// Create an HTTP server
const httpServer = createServer(app);

// Set up WebSocket server with GraphQL subscriptions
const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
});

const wsServerCleanup = useServer({ schema }, wsServer);

// Create Apollo Server instance
const server = new ApolloServer({
    schema,
    context: ({ req }) => {
        const token = req.headers.authorization || '';
        const userId = getUserFromToken(token.replace('Bearer ', ''));
        return { userId };
    },
    introspection: true,
    playground: true,
    plugins: [
        {
            async serverWillStart() {
                return {
                    async drainServer() {
                        await wsServerCleanup.dispose();
                    }
                }
            }
        }
    ]
});

const startServer = async () => {
    // Start Apollo Server
    await server.start();

    // Apply middleware to the Express application
    server.applyMiddleware({ app, path: '/graphql' });

    process.on('SIGINT', () => {
        subscriptionServer.close();
        httpServer.close();
        process.exit();
    });
    httpServer.listen(port, () => {
        console.log(`🚀 Query endpoint ready at http://localhost:${port}/graphql`);
        console.log(`🚀 Subscription endpoint ready at ws://localhost:${port}/graphql`);
    });
};

// Start the server
startServer().catch((error) => {
    console.error('Error starting server:', error);
});
