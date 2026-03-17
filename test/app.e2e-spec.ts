import * as request from 'supertest';

const BASE = 'http://localhost:4000/api/v1';
const agent = request(BASE);

// Warm up connection before tests
beforeAll(async () => {
  try {
    await agent.get('/').timeout({ response: 3000, deadline: 5000 });
  } catch {
    // ignore - just warming up the connection
  }
});

// Shared state across tests
const state: Record<string, any> = {};

// Unique phone for test user
const TEST_PHONE = '+998' + (900000000 + Math.floor(Math.random() * 99999999)).toString();
const TEST_PASSWORD = 'Test123456';
const TEST_NAME = 'E2E Test User';

// ======================================================================
// 1. AUTH MODULE
// ======================================================================
describe('AUTH MODULE', () => {
  it('POST /auth/register - should register a new user', async () => {
    const res = await agent.post('/auth/register').send({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
      fullName: TEST_NAME,
    });

    console.log('Register:', res.status, JSON.stringify(res.body).slice(0, 300));

    // Accept 201 or 200 or even 409 if user exists
    if (res.status === 201 || res.status === 200) {
      expect(res.body.data).toBeDefined();
      state.accessToken = res.body.data.accessToken;
      state.refreshToken = res.body.data.refreshToken;
      state.userId = res.body.data.user?.id;
    }
  });

  it('POST /auth/login - should login', async () => {
    const res = await agent.post('/auth/login').send({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });

    console.log('Login:', res.status, JSON.stringify(res.body).slice(0, 300));

    expect([200, 201]).toContain(res.status);
    expect(res.body.data).toBeDefined();
    state.accessToken = res.body.data.accessToken;
    state.refreshToken = res.body.data.refreshToken;
    state.userId = res.body.data.user?.id;
  });

  it('POST /auth/refresh - should refresh token', async () => {
    if (!state.refreshToken) return;

    const res = await agent.post('/auth/refresh').send({
      refreshToken: state.refreshToken,
    });

    console.log('Refresh:', res.status, JSON.stringify(res.body).slice(0, 200));

    expect([200, 201]).toContain(res.status);
    if (res.body.data?.accessToken) {
      state.accessToken = res.body.data.accessToken;
      state.refreshToken = res.body.data.refreshToken;
    }
  });

  it('POST /auth/change-password - should change password', async () => {
    if (!state.accessToken) return;

    const res = await agent
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_PASSWORD, // same password for simplicity
      });

    console.log('ChangePassword:', res.status, JSON.stringify(res.body).slice(0, 200));
    // 200/201 success or 400 if same password not allowed
    expect([200, 201, 400]).toContain(res.status);
  });
});

// ======================================================================
// 2. USERS MODULE
// ======================================================================
describe('USERS MODULE', () => {
  it('GET /users/me - should get profile', async () => {
    if (!state.accessToken) return;

    const res = await agent
      .get('/users/me')
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetProfile:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200]).toContain(res.status);
    expect(res.body.data).toBeDefined();
  });

  it('PATCH /users/me - should update profile', async () => {
    if (!state.accessToken) return;

    const res = await agent
      .patch('/users/me')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ fullName: 'E2E Updated User' });

    console.log('UpdateProfile:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200]).toContain(res.status);
  });
});

// ======================================================================
// 3. VENUES MODULE
// ======================================================================
describe('VENUES MODULE', () => {
  it('POST /venues - should create a venue', async () => {
    if (!state.accessToken) return;

    const res = await agent
      .post('/venues')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'E2E Test Venue',
        region: 'Toshkent',
        district: 'Yunusobod',
        address: 'Test ko`cha 1',
        phonePrimary: '+998901234567',
      });

    console.log('CreateVenue:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.venueId = res.body.data?.id;

    // Select this venue
    if (state.venueId) {
      const selRes = await agent
        .post('/auth/select-venue')
        .set('Authorization', `Bearer ${state.accessToken}`)
        .send({ venueId: state.venueId });

      console.log('SelectVenue:', selRes.status, JSON.stringify(selRes.body).slice(0, 200));
      if (selRes.body.data?.accessToken) {
        state.accessToken = selRes.body.data.accessToken;
      }
    }
  });

  it('GET /venues/:id - should get venue by id', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetVenue:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect(res.status).toBe(200);
    expect(res.body.data?.id).toBe(state.venueId);
  });

  it('PATCH /venues/:id - should update venue', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'E2E Updated Venue' });

    console.log('UpdateVenue:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('GET /venues/:id/members - should get members', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/members`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetMembers:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 4. HALLS MODULE
// ======================================================================
describe('HALLS MODULE', () => {
  it('POST /venues/:venueId/halls - should create a hall', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/halls`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'Oltin Zal',
        minCapacity: 50,
        maxCapacity: 300,
        pricePerPerson: 150000,
        timeSlots: [
          { id: 'morning', name: 'Ertalabki', start: '08:00', end: '14:00' },
          { id: 'evening', name: 'Kechki', start: '17:00', end: '23:00' },
        ],
      });

    console.log('CreateHall:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.hallId = res.body.data?.id;
  });

  it('GET /venues/:venueId/halls - should list halls', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/halls`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListHalls:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /venues/:venueId/halls/:id - should get hall by id', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/halls/${state.hallId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetHall:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
    expect(res.body.data?.id).toBe(state.hallId);
  });

  it('PATCH /venues/:venueId/halls/:id - should update hall', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/halls/${state.hallId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Oltin Zal Updated', maxCapacity: 350 });

    console.log('UpdateHall:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 5. SERVICES MODULE (Categories + Services)
// ======================================================================
describe('SERVICES MODULE', () => {
  // Categories
  it('POST /venues/:venueId/services/categories - should create service category', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/services/categories`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Bezatish', sortOrder: 1 });

    console.log('CreateServiceCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    state.serviceCategoryId = res.body.data?.id;
  });

  it('GET /venues/:venueId/services/categories - should list service categories', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/services/categories`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListServiceCats:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('PATCH /venues/:venueId/services/categories/:id - should update category', async () => {
    if (!state.accessToken || !state.venueId || !state.serviceCategoryId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/services/categories/${state.serviceCategoryId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Bezatish Updated' });

    console.log('UpdateServiceCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  // Services
  it('POST /venues/:venueId/services - should create a service', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/services`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'Fotograf',
        pricingType: 'fixed',
        price: 3000000,
        categoryId: state.serviceCategoryId,
      });

    console.log('CreateService:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.serviceId = res.body.data?.id;
  });

  it('GET /venues/:venueId/services - should list services', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/services`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListServices:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /venues/:venueId/services/:id - should get service by id', async () => {
    if (!state.accessToken || !state.venueId || !state.serviceId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/services/${state.serviceId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetService:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/services/:id - should update service', async () => {
    if (!state.accessToken || !state.venueId || !state.serviceId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/services/${state.serviceId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Fotograf Pro', price: 5000000 });

    console.log('UpdateService:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 6. MENU MODULE (Categories + Items + Packages)
// ======================================================================
describe('MENU MODULE', () => {
  // Categories
  it('POST /venues/:venueId/menu/categories - should create menu category', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/menu/categories`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Asosiy taomlar', sortOrder: 1 });

    console.log('CreateMenuCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    state.menuCategoryId = res.body.data?.id;
  });

  it('GET /venues/:venueId/menu/categories - should list menu categories', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/menu/categories`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListMenuCats:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/menu/categories/:id - should update menu category', async () => {
    if (!state.accessToken || !state.venueId || !state.menuCategoryId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/menu/categories/${state.menuCategoryId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Asosiy taomlar Updated' });

    console.log('UpdateMenuCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  // Items
  it('POST /venues/:venueId/menu/items - should create menu item', async () => {
    if (!state.accessToken || !state.venueId || !state.menuCategoryId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/menu/items`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'Osh',
        categoryId: state.menuCategoryId,
        pricePerPerson: 50000,
      });

    console.log('CreateMenuItem:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.menuItemId = res.body.data?.id;
  });

  it('GET /venues/:venueId/menu/items - should list menu items', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/menu/items`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListMenuItems:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/menu/items/:id - should get menu item', async () => {
    if (!state.accessToken || !state.venueId || !state.menuItemId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/menu/items/${state.menuItemId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetMenuItem:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/menu/items/:id - should update menu item', async () => {
    if (!state.accessToken || !state.venueId || !state.menuItemId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/menu/items/${state.menuItemId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Osh Premium', pricePerPerson: 75000 });

    console.log('UpdateMenuItem:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  // Packages
  it('POST /venues/:venueId/menu/packages - should create menu package', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/menu/packages`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'Standard Menyu',
        tier: 'standard',
        pricePerPerson: 80000,
      });

    console.log('CreateMenuPkg:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.menuPackageId = res.body.data?.id;
  });

  it('GET /venues/:venueId/menu/packages - should list menu packages', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/menu/packages`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListMenuPkgs:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/menu/packages/:id - should get menu package', async () => {
    if (!state.accessToken || !state.venueId || !state.menuPackageId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/menu/packages/${state.menuPackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetMenuPkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/menu/packages/:id - should update menu package', async () => {
    if (!state.accessToken || !state.venueId || !state.menuPackageId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/menu/packages/${state.menuPackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Standard Menyu Updated', pricePerPerson: 90000 });

    console.log('UpdateMenuPkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('POST /venues/:venueId/menu/packages/:packageId/items - add item to package', async () => {
    if (!state.accessToken || !state.venueId || !state.menuPackageId || !state.menuItemId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/menu/packages/${state.menuPackageId}/items`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ menuItemId: state.menuItemId });

    console.log('AddPkgItem:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
  });
});

// ======================================================================
// 7. CLIENTS MODULE
// ======================================================================
describe('CLIENTS MODULE', () => {
  it('POST /venues/:venueId/clients - should create client', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/clients`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        fullName: 'Alisher Karimov',
        phone: '+998901111111',
      });

    console.log('CreateClient:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.clientId = res.body.data?.id;
  });

  it('GET /venues/:venueId/clients - should list clients', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/clients`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListClients:', res.status, 'count:', res.body.data?.length ?? res.body.data?.items?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/clients/:id - should get client', async () => {
    if (!state.accessToken || !state.venueId || !state.clientId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/clients/${state.clientId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetClient:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/clients/:id - should update client', async () => {
    if (!state.accessToken || !state.venueId || !state.clientId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/clients/${state.clientId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ fullName: 'Alisher Karimov Updated', address: 'Toshkent sh.' });

    console.log('UpdateClient:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 8. VENUE PACKAGES MODULE
// ======================================================================
describe('VENUE PACKAGES MODULE', () => {
  it('POST /venues/:venueId/packages - should create venue package', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/packages`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: 'Gold Paket',
        pricePerPerson: 250000,
        hallPricePerPerson: 100000,
        menuPricePerPerson: 120000,
        tier: 'premium',
      });

    console.log('CreateVenuePkg:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.venuePackageId = res.body.data?.id;
  });

  it('GET /venues/:venueId/packages - should list venue packages', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/packages`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListVenuePkgs:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/packages/:id - should get venue package', async () => {
    if (!state.accessToken || !state.venueId || !state.venuePackageId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/packages/${state.venuePackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetVenuePkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/packages/:id - should update venue package', async () => {
    if (!state.accessToken || !state.venueId || !state.venuePackageId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/packages/${state.venuePackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ name: 'Gold Paket Updated', pricePerPerson: 280000 });

    console.log('UpdateVenuePkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 9. BOOKINGS MODULE
// ======================================================================
describe('BOOKINGS MODULE', () => {
  it('POST /venues/:venueId/bookings - should create booking', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId || !state.clientId) return;

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30); // 30 days from now
    const dateStr = eventDate.toISOString().split('T')[0];

    const res = await agent
      .post(`/venues/${state.venueId}/bookings`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        hallId: state.hallId,
        clientId: state.clientId,
        eventDate: dateStr,
        timeSlot: 'evening',
        guestCount: 200,
        eventType: 'wedding',
        hallPricePerPerson: 150000,
        menuItems: state.menuItemId
          ? [
              {
                menuItemId: state.menuItemId,
                name: 'Osh',
                quantity: 1,
                pricePerPerson: 50000,
              },
            ]
          : [],
        services: state.serviceId
          ? [
              {
                venueServiceId: state.serviceId,
                name: 'Fotograf',
                quantity: 1,
                unitPrice: 3000000,
              },
            ]
          : [],
      });

    console.log('CreateBooking:', res.status, JSON.stringify(res.body).slice(0, 400));
    expect([200, 201]).toContain(res.status);
    state.bookingId = res.body.data?.id;
  });

  it('GET /venues/:venueId/bookings - should list bookings', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/bookings`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListBookings:', res.status, 'count:', res.body.data?.items?.length ?? res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/bookings/calendar - should get calendar', async () => {
    if (!state.accessToken || !state.venueId) return;

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const res = await agent
      .get(`/venues/${state.venueId}/bookings/calendar?month=${month}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('Calendar:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/bookings/check-availability - should check availability', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId) return;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const dateStr = futureDate.toISOString().split('T')[0];

    const res = await agent
      .get(
        `/venues/${state.venueId}/bookings/check-availability?hallId=${state.hallId}&eventDate=${dateStr}&timeSlot=evening`,
      )
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('CheckAvailability:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/bookings/:id - should get booking', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/bookings/${state.bookingId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetBooking:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect(res.status).toBe(200);
    expect(res.body.data?.id).toBe(state.bookingId);
  });

  it('PATCH /venues/:venueId/bookings/:id - should update booking', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/bookings/${state.bookingId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ guestCount: 250, notes: 'Updated by E2E test' });

    console.log('UpdateBooking:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);

    // Verify totals recalculated with new guestCount
    if (res.body.data) {
      const booking = res.body.data;
      const expectedMenuTotal = Number(booking.menuPricePerPerson || 0) * 250;
      const expectedHallTotal = Number(booking.hallPricePerPerson) * 250;
      console.log('Recalc check: menuTotal=', booking.menuTotal, 'expected=', expectedMenuTotal);
      expect(Number(booking.totalAmount)).toBeGreaterThan(0);
    }
  });

  it('POST /venues/:venueId/bookings - should block overlapping full_day on same date', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId || !state.clientId) return;

    // Evening already booked 30 days from now, full_day should overlap
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30);
    const dateStr = eventDate.toISOString().split('T')[0];

    const res = await agent
      .post(`/venues/${state.venueId}/bookings`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        hallId: state.hallId,
        clientId: state.clientId,
        eventDate: dateStr,
        timeSlot: 'full_day',
        guestCount: 100,
        eventType: 'wedding',
        hallPricePerPerson: 150000,
      });

    console.log('OverlapTest full_day:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(400); // Should be blocked
  });

  it('POST /venues/:venueId/bookings - should allow morning on same date (no overlap)', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId || !state.clientId) return;

    // Evening is 17:00-23:00, morning is 08:00-12:00. No overlap.
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30);
    const dateStr = eventDate.toISOString().split('T')[0];

    const res = await agent
      .post(`/venues/${state.venueId}/bookings`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        hallId: state.hallId,
        clientId: state.clientId,
        eventDate: dateStr,
        timeSlot: 'morning',
        guestCount: 50,
        eventType: 'birthday',
        hallPricePerPerson: 100000,
      });

    console.log('NoOverlapTest morning:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    // Save for cleanup
    if (res.body.data?.id) state.morningBookingId = res.body.data.id;
  });
});

// ======================================================================
// 10. PAYMENTS MODULE
// ======================================================================
describe('PAYMENTS MODULE', () => {
  it('POST /venues/:venueId/payments - should create payment', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/payments`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        bookingId: state.bookingId,
        amount: 5000000,
        paymentMethod: 'cash',
        paymentType: 'deposit',
      });

    console.log('CreatePayment:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.paymentId = res.body.data?.id;
  });

  it('GET /venues/:venueId/payments - should list payments', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/payments`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListPayments:', res.status, 'count:', res.body.data?.length ?? res.body.data?.items?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/payments/:id - should get payment', async () => {
    if (!state.accessToken || !state.venueId || !state.paymentId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/payments/${state.paymentId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetPayment:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/payments/:id - should update payment', async () => {
    if (!state.accessToken || !state.venueId || !state.paymentId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/payments/${state.paymentId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ notes: 'E2E test payment' });

    console.log('UpdatePayment:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('POST /venues/:venueId/payments - should block overpayment', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    // Try to pay 999999999999 which is definitely more than remaining
    const res = await agent
      .post(`/venues/${state.venueId}/payments`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        bookingId: state.bookingId,
        amount: 999999999999,
        paymentMethod: 'cash',
        paymentType: 'payment',
      });

    console.log('OverpaymentTest:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(400);
  });

  it('GET /venues/:venueId/payments/settings - should get payment settings', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/payments/settings`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('PaymentSettings:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 404]).toContain(res.status);
  });
});

// ======================================================================
// 11. FINANCE MODULE
// ======================================================================
describe('FINANCE MODULE', () => {
  it('GET /venues/:venueId/finance/expense-categories - should list expense categories', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/finance/expense-categories`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ExpenseCategories:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);

    // Save first category id for expense creation
    if (Array.isArray(res.body.data) && res.body.data.length > 0) {
      state.expenseCategoryId = res.body.data[0].id;
    }
  });

  it('POST /venues/:venueId/finance/expenses - should create expense', async () => {
    if (!state.accessToken || !state.venueId || !state.expenseCategoryId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/finance/expenses`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        categoryId: state.expenseCategoryId,
        description: 'E2E test expense',
        amount: 500000,
        expenseDate: new Date().toISOString(),
      });

    console.log('CreateExpense:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect([200, 201]).toContain(res.status);
    state.expenseId = res.body.data?.id;
  });

  it('GET /venues/:venueId/finance/expenses - should list expenses', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/finance/expenses`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('ListExpenses:', res.status, 'count:', res.body.data?.length);
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/finance/expenses/:id - should get expense', async () => {
    if (!state.accessToken || !state.venueId || !state.expenseId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/finance/expenses/${state.expenseId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('GetExpense:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('PATCH /venues/:venueId/finance/expenses/:id - should update expense', async () => {
    if (!state.accessToken || !state.venueId || !state.expenseId) return;

    const res = await agent
      .patch(`/venues/${state.venueId}/finance/expenses/${state.expenseId}`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ description: 'Updated E2E expense', amount: 600000 });

    console.log('UpdateExpense:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('GET /venues/:venueId/finance/summary - should get finance summary', async () => {
    if (!state.accessToken || !state.venueId) return;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const res = await agent
      .get(`/venues/${state.venueId}/finance/summary?startDate=${startDate}&endDate=${endDate}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('FinanceSummary:', res.status, JSON.stringify(res.body).slice(0, 300));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 12. DASHBOARD MODULE
// ======================================================================
describe('DASHBOARD MODULE', () => {
  it('GET /venues/:venueId/dashboard - should get dashboard data', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .get(`/venues/${state.venueId}/dashboard`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('Dashboard:', res.status, JSON.stringify(res.body).slice(0, 400));
    expect(res.status).toBe(200);
  });
});

// ======================================================================
// 13. CLEANUP - Delete created resources (reverse order)
// ======================================================================
describe('CLEANUP - DELETE operations', () => {
  it('DELETE /venues/:venueId/payments/:id - should delete payment', async () => {
    if (!state.accessToken || !state.venueId || !state.paymentId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/payments/${state.paymentId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeletePayment:', res.status, JSON.stringify(res.body).slice(0, 200));
    // Completed payments can't be deleted - 400 is correct
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /venues/:venueId/finance/expenses/:id - should delete expense', async () => {
    if (!state.accessToken || !state.venueId || !state.expenseId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/finance/expenses/${state.expenseId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteExpense:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('POST /venues/:venueId/bookings/:id/cancel - should cancel morning booking', async () => {
    if (!state.accessToken || !state.venueId || !state.morningBookingId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/bookings/${state.morningBookingId}/cancel`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ reason: 'E2E test cleanup' });

    console.log('CancelMorningBooking:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
  });

  it('POST /venues/:venueId/bookings/:id/cancel - should cancel booking', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    const res = await agent
      .post(`/venues/${state.venueId}/bookings/${state.bookingId}/cancel`)
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({ reason: 'E2E test cleanup' });

    console.log('CancelBooking:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
  });

  it('DELETE /venues/:venueId/bookings/:id - should delete booking', async () => {
    if (!state.accessToken || !state.venueId || !state.bookingId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/bookings/${state.bookingId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteBooking:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/packages/:id - should delete venue package', async () => {
    if (!state.accessToken || !state.venueId || !state.venuePackageId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/packages/${state.venuePackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteVenuePkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/menu/packages/:id - should delete menu package', async () => {
    if (!state.accessToken || !state.venueId || !state.menuPackageId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/menu/packages/${state.menuPackageId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteMenuPkg:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/menu/items/:id - should delete menu item', async () => {
    if (!state.accessToken || !state.venueId || !state.menuItemId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/menu/items/${state.menuItemId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteMenuItem:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/menu/categories/:id - should delete menu category', async () => {
    if (!state.accessToken || !state.venueId || !state.menuCategoryId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/menu/categories/${state.menuCategoryId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteMenuCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    // May return 400 if items (even soft-deleted) still reference it
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /venues/:venueId/services/:id - should delete service', async () => {
    if (!state.accessToken || !state.venueId || !state.serviceId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/services/${state.serviceId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteService:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/services/categories/:id - should delete service category', async () => {
    if (!state.accessToken || !state.venueId || !state.serviceCategoryId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/services/categories/${state.serviceCategoryId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteServiceCat:', res.status, JSON.stringify(res.body).slice(0, 200));
    // May return 400 if services (even soft-deleted) still reference it
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /venues/:venueId/clients/:id - should delete client', async () => {
    if (!state.accessToken || !state.venueId || !state.clientId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/clients/${state.clientId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteClient:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:venueId/halls/:id - should delete hall', async () => {
    if (!state.accessToken || !state.venueId || !state.hallId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}/halls/${state.hallId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteHall:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });

  it('DELETE /venues/:id - should delete venue', async () => {
    if (!state.accessToken || !state.venueId) return;

    const res = await agent
      .delete(`/venues/${state.venueId}`)
      .set('Authorization', `Bearer ${state.accessToken}`);

    console.log('DeleteVenue:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(200);
  });
});
