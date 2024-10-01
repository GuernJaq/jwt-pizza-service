const request = require('supertest');
const app = require('../service');

//const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const testFranchise = { name: "pizzaPocket", admins: [] }
const testStore = {franchiseId: 1, name:"SLC"}

//const initUser = { name : '常用名字', email: 'a@jwt.com', password: 'admin'}
let adminUser;
let adminUserAuthtoken;
//let testUserAuthToken;

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

    //USE FOR FAILURE TESTS (if I decide to do that)
    /*testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;*/

    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminUserAuthtoken = loginRes.body.token

    testFranchise.admins.push({ email: adminUser.email })
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testFranchise)
    console.log(franchiseRes.body)
});

test('create franchise', async () => {
    const thisTestFranchise = { name: Math.random().toString(36).substring(2, 12), admins: [{ email: adminUser.email }] }
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(thisTestFranchise)
    expect(franchiseRes.status).toBe(200)
    expect(franchiseRes.body.name).toBe(thisTestFranchise.name)
})

test('create store', async () => {
    const storeRes = await request(app).post('/api/franchise/1/store').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testStore)
    expect(storeRes.status).toBe(200)
    expect(storeRes.body.name).toBe(testStore.name)
})

test('delete franchise', async () => {
    const deleteFranchise = { name: Math.random().toString(36).substring(2, 12), admins: [{ email: adminUser.email }] }
    const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(deleteFranchise)
    
    const deleteRes = await request(app).delete('/api/franchise/' + franchiseRes.body.id).set('Authorization', `Bearer ${adminUserAuthtoken}`)
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.message).toBe("franchise deleted")
})

test('delete store', async () => {
    const storeRes = await request(app).post('/api/franchise/1/store').set('Authorization', `Bearer ${adminUserAuthtoken}`).send(testStore)
    
    const deleteRes = await request(app).delete('/api/franchise/1/store/' + storeRes.body.id).set('Authorization', `Bearer ${adminUserAuthtoken}`)
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.message).toBe("store deleted")
})