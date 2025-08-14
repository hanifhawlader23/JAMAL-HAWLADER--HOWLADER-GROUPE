// Simple in-memory authentication for demo purposes
// In production, you'd want to use a proper database

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

// Demo users (in production, this would be in a database)
const users: User[] = [
  {
    id: '1',
    email: 'admin@hawlader.eu',
    password: 'Hawlader@2025!',
    name: 'Admin Hawlader',
    role: 'admin'
  },
  {
    id: '2', 
    email: 'hanif@hawlader.eu',
    password: 'Hanif@2025!',
    name: 'Hanif Hawlader',
    role: 'admin'
  }
];

export const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

export const createUser = (email: string, password: string, name: string): User => {
  const newUser: User = {
    id: (users.length + 1).toString(),
    email: email.toLowerCase(),
    password,
    name,
    role: 'user'
  };
  users.push(newUser);
  return newUser;
};

export const validateCredentials = (email: string, password: string): User | null => {
  const user = findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
};