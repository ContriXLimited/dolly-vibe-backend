import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔍 Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'));
    
    // Test connection with timeout
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout (15 seconds)')), 15000)
      )
    ]);
    
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test successful:', result);
    
    // List tables (if possible)
    try {
      const tables = await prisma.$queryRaw`SHOW TABLES`;
      console.log('📋 Available tables:', tables);
    } catch (error) {
      console.log('ℹ️  Could not list tables (this is normal if schema not created yet)');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if the database server is running');
      console.log('2. Verify network connectivity to the host');
      console.log('3. Check if firewall/security groups allow the connection');
      console.log('4. Verify the database URL is correct');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();