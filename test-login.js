import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

async function testLogin() {
  try {
    console.log('Attempting to login with admin/admin...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response data:', response.data);
    console.log('Login successful!');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    
    try {
      console.log('\nAttempting to login with admin/password123...');
      const response2 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'password123'
      });
      
      console.log('Login response status:', response2.status);
      console.log('Login response data:', response2.data);
      console.log('Login successful!');
      return true;
    } catch (error2) {
      console.error('Second login attempt failed:', error2.response?.data || error2.message);
      
      try {
        console.log('\nAttempting to login with admin/password...');
        const response3 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          username: 'admin',
          password: 'password'
        });
        
        console.log('Login response status:', response3.status);
        console.log('Login response data:', response3.data);
        console.log('Login successful!');
        return true;
      } catch (error3) {
        console.error('Third login attempt failed:', error3.response?.data || error3.message);
        return false;
      }
    }
  }
}

testLogin().then(success => {
  if (success) {
    console.log('Successfully determined login credentials!');
  } else {
    console.log('Could not determine the correct login credentials.');
  }
});