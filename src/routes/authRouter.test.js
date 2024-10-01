const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const emptyUser = {};
const initUser = { name : '常用名字', email: 'a@jwt.com', password: 'admin'}
let adminUserAuthtoken;
let testUserAuthToken;

const { DB } = require('../database/database.js');

async function createAdminUser() {
    await DB.addUser(initUser);
}

beforeAll(async () => {
    //createAdminUser()
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    const loginRes = await request(app).put('/api/auth').send(initUser);
    adminUserAuthtoken = loginRes.body.token
});

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
    expect(loginRes.body.user).toMatchObject(user);
    console.log(password) //added until tests use password
});

test('logout', async () => {
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.message).toBe("logout successful")
});

test('failed calls', async () => {
    const logoutRes = await request(app).delete('/api/auth'); //no authtoken makes it fail
    expect(logoutRes.status).toBe(401)
    expect(logoutRes.body.message).toBe("unauthorized")

    const registerRes = await request(app).post('/api/auth').send(emptyUser); //registration with no params
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toMatch("name, email, and password are required");
});

test('update user', async () => {
    const updateRes = await request(app).put('/api/auth/1').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(initUser);
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.email).toBe(initUser.email)
    expect(updateRes.body.name).toBe(initUser.name)
})