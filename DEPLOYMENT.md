# Northflank Deployment Guide

This guide explains how to deploy the Dolly Vibe Backend to Northflank.

## Prerequisites

1. Northflank account
2. Git repository connected to Northflank
3. MySQL database (can be created on Northflank)

## Environment Variables Setup

Before deploying, you need to set up the following secrets in Northflank:

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | JWT signing secret | Generate a random 64-character string |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | From Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | From Discord Developer Portal |
| `DISCORD_REDIRECT_URI` | Discord OAuth callback URL | `https://p01--dolly-vibe-backend--jlqhr9wl7sxr.code.run/auth/discord/callback` |
| `DISCORD_GUILD_ID` | Discord server ID for verification | Your Discord server ID |
| `TWITTER_API_KEY` | Twitter API key | From Twitter Developer Portal |
| `TWITTER_API_SECRET` | Twitter API secret | From Twitter Developer Portal |
| `TWITTER_CALLBACK_URL` | Twitter OAuth callback URL | `https://p01--dolly-vibe-backend--jlqhr9wl7sxr.code.run/auth/twitter/callback` |
| `DOLLY_TWITTER_ID` | Dolly's Twitter username | `AskDollyToday` |

## Deployment Steps

### Option 1: Using Northflank Web Interface

1. **Create a new service**:
   - Go to Northflank dashboard
   - Click "Create Service"
   - Select "Combined Service" (Build + Deploy)

2. **Configure the build**:
   - Repository: Connect your Git repository
   - Build from: Dockerfile
   - Dockerfile path: `./Dockerfile`

3. **Configure the deployment**:
   - Port: 3000
   - CPU: 0.2 vCPU (minimum)
   - Memory: 512 MiB (minimum)
   - Replicas: 1 (can scale up later)

4. **Add environment variables**:
   - Go to "Environment" tab
   - Add all the required environment variables listed above
   - Use Northflank's secret management for sensitive data

5. **Configure health checks**:
   - Enable health checks
   - Health check path: `/health`
   - Initial delay: 30 seconds
   - Check interval: 10 seconds

6. **Deploy**:
   - Click "Create & Deploy"

### Option 2: Using northflank.json

1. **Upload the configuration**:
   - Use the provided `northflank.json` file
   - Modify the environment variables section with your values
   - Deploy using Northflank CLI or web interface

### Option 3: Using Northflank CLI

```bash
# Install Northflank CLI
npm install -g @northflank/cli

# Login to Northflank
northflank login

# Deploy using the configuration file
northflank deploy --file northflank.json
```

## Database Setup

### Option 1: Use Northflank MySQL Addon

1. Create a MySQL addon in Northflank
2. Get the connection string from the addon details
3. Use it as the `DATABASE_URL` environment variable

### Option 2: External Database

1. Use any MySQL-compatible database (AWS RDS, PlanetScale, etc.)
2. Ensure the database is accessible from Northflank
3. Configure the connection string

### Database Migration

After deployment, run Prisma migrations:

```bash
# SSH into your Northflank container or use a job
npx prisma migrate deploy
```

## Custom Domain Setup

1. Go to your service settings in Northflank
2. Navigate to "Public Access" > "Domains"
3. Add your custom domain
4. Update your OAuth callback URLs to use the new domain

## Monitoring and Logs

1. **Health Check**: Available at `https://p01--dolly-vibe-backend--jlqhr9wl7sxr.code.run/health`
2. **API Documentation**: Available at `https://p01--dolly-vibe-backend--jlqhr9wl7sxr.code.run/api`
3. **Root Endpoint**: Available at `https://p01--dolly-vibe-backend--jlqhr9wl7sxr.code.run/`
4. **Logs**: Available in Northflank dashboard under "Logs" tab
5. **Metrics**: Available in Northflank dashboard under "Metrics" tab

## Scaling

To handle more traffic:

1. Increase CPU/Memory allocation
2. Scale up replicas (horizontal scaling)
3. Enable autoscaling based on CPU/Memory usage

## Security Considerations

1. Use Northflank's secret management for sensitive environment variables
2. Enable HTTPS (automatically provided by Northflank)
3. Consider using a CDN for static assets
4. Regularly update dependencies

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check DATABASE_URL format
   - Ensure database is accessible
   - Run `npx prisma migrate deploy`

2. **OAuth Callback Errors**:
   - Verify callback URLs match your domain
   - Check OAuth app settings in Discord/Twitter

3. **Build Failures**:
   - Check Dockerfile syntax
   - Ensure all dependencies are listed in package.json
   - Review build logs in Northflank

### Health Check Endpoint

The application includes a health check endpoint at `/health` that verifies:
- Application is running
- Database connectivity
- System uptime and metrics

Use this endpoint for monitoring and load balancer health checks.

## Support

For deployment issues:
1. Check Northflank documentation
2. Review application logs
3. Contact the development team