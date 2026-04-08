#!/bin/bash
# Pre-flight: AWS + Neon setup (production tier)
# Database is Neon (serverless Postgres) — not RDS.
# AWS handles: S3 (storage), ECR (container registry), ECS Fargate (compute).
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="namuh-mintlify"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "=== Pre-flight Setup (AWS + Neon) ==="
echo ""

# 1. Neon database
echo "--- Neon Database ---"
if ! grep -q '^DATABASE_URL=.' .env 2>/dev/null; then
  echo "ERROR: DATABASE_URL not set in .env. Add your Neon connection string first."
  echo "  Example: DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
  exit 1
fi
grep -q '^DB_SSL=' .env || echo "DB_SSL=true" >> .env
echo "Database: Neon (from DATABASE_URL in .env) ✓"

# 2. Better Auth secret
echo ""
echo "--- Better Auth ---"
if ! grep -q '^BETTER_AUTH_SECRET=.' .env 2>/dev/null; then
  SECRET=$(openssl rand -base64 32)
  echo "BETTER_AUTH_SECRET=${SECRET}" >> .env
  echo "Generated BETTER_AUTH_SECRET ✓"
else
  echo "BETTER_AUTH_SECRET already set ✓"
fi
if ! grep -q '^BETTER_AUTH_URL=.' .env 2>/dev/null; then
  echo "BETTER_AUTH_URL=http://localhost:3015" >> .env
  echo "Set BETTER_AUTH_URL=http://localhost:3015 ✓"
else
  echo "BETTER_AUTH_URL already set ✓"
fi

# 3. S3 bucket
echo ""
echo "--- S3 Storage ---"
BUCKET_NAME="${APP_NAME}-assets-$(aws sts get-caller-identity --query Account --output text)"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "S3 bucket already exists: ${BUCKET_NAME} ✓"
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$AWS_REGION" \
    ${AWS_REGION:+$([ "$AWS_REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$AWS_REGION" || echo "")} \
    --output text > /dev/null
  echo "Created S3 bucket: ${BUCKET_NAME} ✓"
fi

# Set CORS for browser uploads
aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3015"],
    "MaxAgeSeconds": 3600
  }]
}'
echo "S3 CORS configured ✓"

# Write S3 env vars
grep -q '^S3_BUCKET=' .env || echo "S3_BUCKET=${BUCKET_NAME}" >> .env
grep -q '^AWS_REGION=' .env || echo "AWS_REGION=${AWS_REGION}" >> .env

# 4. ECR repository
echo ""
echo "--- ECR Repository ---"
if aws ecr describe-repositories --repository-names "$APP_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "ECR repo already exists: ${APP_NAME} ✓"
else
  aws ecr create-repository \
    --repository-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --output text > /dev/null
  echo "Created ECR repo: ${APP_NAME} ✓"
fi

ECR_URI=$(aws ecr describe-repositories --repository-names "$APP_NAME" --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text)
grep -q '^ECR_URI=' .env || echo "ECR_URI=${ECR_URI}" >> .env

# 5. Push Drizzle schema
echo ""
echo "--- Database Schema ---"
npm run db:push 2>&1 || echo "WARNING: db:push failed — schema may need to be created after build"

echo ""
echo "=== Pre-flight Complete ==="
echo "  Database:  Neon (serverless Postgres)"
echo "  Storage:   S3 (${BUCKET_NAME})"
echo "  Registry:  ECR (${ECR_URI})"
echo "  Auth:      Better Auth (Google OAuth)"
echo ""
echo "Ready for the build loop."
