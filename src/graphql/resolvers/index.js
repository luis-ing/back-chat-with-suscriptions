const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PubSub } = require('graphql-subscriptions');
const { PrismaClient } = require('@prisma/client');
const pubsub = new PubSub();
const prisma = new PrismaClient();

const resolvers = {
    Query: {
        me: async (_, __, { userId }) => {
            if (!userId) throw new Error("Not authenticated");
            return prisma.user.findUnique({ where: { id: userId } });
        },
        users: () => prisma.user.findMany(),
        chats: async (_, __, { userId }) => {
            if (!userId) throw new Error("Not authenticated");
            return prisma.chat.findMany({
                where: { members: { some: { id: userId } } },
                include: { members: true, messages: true },
            });
        },
    },
    Mutation: {
        register: async (_, { username, email, password }) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            return prisma.user.create({
                data: { username, email, password: hashedPassword },
            });
        },
        login: async (_, { email, password }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new Error("Invalid credentials");
            }
            return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        },
        createChat: async (_, { isGroup, memberIds }, { userId }) => {
            if (!userId) throw new Error("Not authenticated");
            const chat = await prisma.chat.create({
                data: {
                    isGroup,
                    members: { connect: memberIds.map(id => ({ id })) },
                },
                include: { members: true, messages: true },
            });
            return chat;
        },
        sendMessage: async (_, { chatId, content }, { userId }) => {
            if (!userId) throw new Error("Not authenticated");
            const message = await prisma.message.create({
                data: {
                    content,
                    sender: { connect: { id: userId } },
                    chat: { connect: { id: chatId } },
                },
                include: { sender: true, chat: true },
            });
            pubsub.publish(`MESSAGE_SENT_${chatId}`, { messageSent: message });
            return message;
        },
    },
    Subscription: {
        messageSent: {
            subscribe: (_, { chatId }) => pubsub.asyncIterator(`MESSAGE_SENT_${chatId}`),
        },
    },
};

module.exports = resolvers;
