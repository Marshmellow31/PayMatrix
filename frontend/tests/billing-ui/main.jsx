import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import SubscriptionSettingsCard from '../../src/components/profile/SubscriptionSettingsCard.jsx';
import '../../src/index.css';
const store = configureStore({
  reducer: () => ({ auth: { user: { uid: 'fixture-user', name: 'Test user' } } }),
});
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <main style={{ maxWidth: 760, margin: '32px auto', padding: 16 }}>
        <SubscriptionSettingsCard />
      </main>
    </BrowserRouter>
  </Provider>
);
