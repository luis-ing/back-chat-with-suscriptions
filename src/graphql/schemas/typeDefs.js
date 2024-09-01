const { gql } = require('apollo-server');

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type Message {
    id: ID!
    content: String!
    sender: User!
    chat: Chat!
    createdAt: String!
  }

  type Chat {
    id: ID!
    isGroup: Boolean!
    members: [User!]!
    messages: [Message!]!
  }

  type Query {
    me: User
    users: [User!]!
    chats: [Chat!]!
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User!
    login(email: String!, password: String!): String! # JWT Token
    createChat(isGroup: Boolean!, memberIds: [Int!]!): Chat!
    sendMessage(chatId: Int!, content: String!): Message!
  }

  type Subscription {
    messageSent(chatId: Int!): Message!
    newMessage(chatId: Int!): Message!
  }
`;

module.exports = typeDefs;
