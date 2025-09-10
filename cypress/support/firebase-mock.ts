/// <reference types="cypress" />

// Firebase Mock Configuration for E2E Tests
export const setupFirebaseMocks = () => {
  cy.window().then((win: any) => {
    // Mock Firebase configuration
    win.process = { env: { NODE_ENV: 'test' } };
    
    // Mock Firebase config
    win.__FIREBASE_CONFIG__ = {
      apiKey: 'mock-api-key',
      authDomain: 'mock-project.firebaseapp.com',
      projectId: 'mock-project',
      storageBucket: 'mock-project.appspot.com',
      messagingSenderId: '123456789',
      appId: 'mock-app-id'
    };

    // Mock Firebase Auth
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true
    };

    // Mock Firebase modules
    win.firebase = {
      initializeApp: cy.stub().returns({}),
      auth: cy.stub().returns({
        currentUser: mockUser,
        signInWithEmailAndPassword: cy.stub().resolves({ user: mockUser }),
        createUserWithEmailAndPassword: cy.stub().resolves({ user: mockUser }),
        signOut: cy.stub().resolves(),
        onAuthStateChanged: cy.stub().callsFake((callback) => {
          callback(mockUser);
          return cy.stub(); // unsubscribe function
        })
      }),
      firestore: cy.stub().returns({
        collection: cy.stub().returns({
          add: cy.stub().resolves({ id: 'mock-doc-id' }),
          doc: cy.stub().returns({
            get: cy.stub().resolves({
              exists: true,
              id: 'mock-doc-id',
              data: () => ({ name: 'Mock Data', createdAt: new Date() })
            }),
            set: cy.stub().resolves(),
            update: cy.stub().resolves(),
            delete: cy.stub().resolves()
          }),
          where: cy.stub().returnsThis(),
          orderBy: cy.stub().returnsThis(),
          limit: cy.stub().returnsThis(),
          get: cy.stub().resolves({
            docs: [
              {
                id: 'mock-doc-1',
                data: () => ({ name: 'Mock Client 1' })
              },
              {
                id: 'mock-doc-2', 
                data: () => ({ name: 'Mock Client 2' })
              }
            ]
          })
        })
      })
    };

    // Mock Firebase modules for ES6 imports
    win.__firebase_modules__ = {
      'firebase/app': {
        initializeApp: win.firebase.initializeApp
      },
      'firebase/auth': {
        getAuth: cy.stub().returns(win.firebase.auth()),
        signInWithEmailAndPassword: win.firebase.auth().signInWithEmailAndPassword,
        createUserWithEmailAndPassword: win.firebase.auth().createUserWithEmailAndPassword,
        signOut: win.firebase.auth().signOut,
        onAuthStateChanged: win.firebase.auth().onAuthStateChanged
      },
      'firebase/firestore': {
        getFirestore: cy.stub().returns(win.firebase.firestore()),
        collection: win.firebase.firestore().collection,
        doc: win.firebase.firestore().collection().doc,
        addDoc: win.firebase.firestore().collection().add,
        updateDoc: win.firebase.firestore().collection().doc().update,
        deleteDoc: win.firebase.firestore().collection().doc().delete,
        getDocs: win.firebase.firestore().collection().get,
        getDoc: win.firebase.firestore().collection().doc().get
      }
    };
  });
};

// Intercept Firebase network requests
export const interceptFirebaseRequests = () => {
  // Intercept Firebase Auth requests
  cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', {
    statusCode: 200,
    body: {
      localId: 'test-user-123',
      email: 'test@example.com',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token'
    }
  }).as('firebaseAuth');

  // Intercept Firestore requests
  cy.intercept('POST', '**/firestore.googleapis.com/**', {
    statusCode: 200,
    body: {
      documents: [
        {
          name: 'projects/mock-project/databases/(default)/documents/clients/mock-doc-1',
          fields: {
            name: { stringValue: 'Mock Client 1' },
            email: { stringValue: 'client1@example.com' }
          }
        }
      ]
    }
  }).as('firestoreQuery');
};
