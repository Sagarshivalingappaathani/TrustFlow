# Account Switching Test Instructions

## How to Test MetaMask Account Switching

### 1. Setup Multiple Accounts in MetaMask
- Open MetaMask
- Click the account icon (top right)
- Click "Create Account" or import additional accounts
- Ensure you have at least 2-3 accounts available

### 2. Test Account Switching

#### **Step 1: Connect Initial Account**
1. Open your TrustFlow frontend (http://localhost:3000)
2. Click "Connect Wallet"
3. Select your first account in MetaMask
4. Note the account address displayed in the navigation

#### **Step 2: Switch Accounts in MetaMask**
1. Click the MetaMask extension icon
2. Click the account dropdown
3. Select a different account
4. Watch the frontend automatically update

### 3. Expected Behavior

#### **Visual Feedback:**
- Toast notification: "Account changed, updating..."
- Navigation shows "Switching..." briefly
- Toast notification: "Switched to account: 0x1234...5678"

#### **Data Updates:**
- Navigation bar shows new account address
- Dashboard data refreshes for new account
- Products page shows products owned by new account
- Relationships page shows relationships for new account
- All pages automatically reload their data

#### **Registration Status:**
- If new account is not registered, registration modal appears
- If new account is registered, shows company information

### 4. Test Scenarios

#### **Scenario A: Switch to Unregistered Account**
1. Switch to an account that hasn't registered a company
2. Registration modal should automatically appear
3. Register the company
4. Pages should load with new company data

#### **Scenario B: Switch to Registered Account**
1. Switch to an account with an existing company
2. All data should refresh automatically
3. No registration modal should appear

#### **Scenario C: Network Changes**
1. Switch MetaMask to different network
2. Frontend should detect and prompt to switch back
3. Should automatically reconnect when on correct network

### 5. Pages That Auto-Update on Account Change

✅ **Dashboard**: Company stats, recent activities
✅ **Products**: User's product inventory  
✅ **Relationships**: User's relationships (active/pending)
✅ **Navigation**: Account address, balance, registration status

### 6. Troubleshooting

If switching doesn't work:
1. Refresh the page manually
2. Disconnect and reconnect wallet
3. Check browser console for errors
4. Ensure MetaMask is unlocked

### 7. Technical Implementation

The automatic switching works through:
- MetaMask `accountsChanged` event listeners
- React Context state management
- useEffect dependency arrays include `account`
- Toast notifications for user feedback
- Error handling for failed switches

This ensures a seamless user experience when switching between multiple accounts!