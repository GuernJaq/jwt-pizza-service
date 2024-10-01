const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const testItem = { title: "Student", description: "No topping, no sauce, just carbs", image: "pizza9.png", price: 0.0001 }
const testFranchise = { name: "pizzaPocket", admins: [] }
const testOrder = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: "Veggie", price: 0.05 }] }
const testStore = {franchiseId: 1, name:"SLC"}

//const initUser = { name : '常用名字', email: 'a@jwt.com', password: 'admin'}
let adminUser;
let adminUserAuthtoken;
let testUserAuthToken;

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = Math.random().toString(36).substring(2, 12);
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}

beforeAll(async () => {
    adminUser = await createAdminUser()

    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminUserAuthtoken = loginRes.body.token

    testFranchise.admins.push({ email: adminUser.email })
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testFranchise)
    console.log(franchiseRes.body)

    const storeRes = await request(app).post('/api/franchise/1/store').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testStore)
    console.log(storeRes.body)
});

test('get menu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
});

test('add menu', async () => {
    const menuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testItem);
    expect(menuRes.status).toBe(200);
});

test('add menu fail', async () => {
    const menuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`).send(testItem);
    expect(menuRes.status).toBe(403);
    expect(menuRes.body.message).toBe("unable to add menu item")
});

test('get order', async () => {
    const orderRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`)
    expect(orderRes.status).toBe(200);
})

test('place order', async () => {
    const menuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testItem);
    expect(menuRes.status).toBe(200);
    const orderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(testOrder)
    console.log(orderRes.body)
    expect(orderRes.status).toBe(200)
})