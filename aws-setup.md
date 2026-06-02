# AWS Deployment Setup Guide
ClothCo — ECS Fargate + ALB + Auto Scaling + GitHub Actions CI/CD

---

## Overview of what you're building

```
GitHub push → GitHub Actions → ECR (Docker image) → ECS Fargate
                                                          ↓
Internet → Route 53 (optional) → ALB → ECS Service (auto-scaled containers)
                                                          ↓
                                                   MongoDB Atlas
```

---

## Step 1 — Create an IAM User for GitHub Actions

1. Go to **IAM → Users → Create user**
2. Name: `clothco-github-actions`
3. Attach these policies directly:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonSSMReadOnlyAccess`
4. Create user → **Create access key** → choose *Other*
5. Copy **Access Key ID** and **Secret Access Key** — you'll need these in Step 6

---

## Step 2 — Store secrets in AWS Systems Manager (Parameter Store)

This keeps your `.env` secrets out of GitHub and out of the Docker image.

1. Go to **Systems Manager → Parameter Store → Create parameter**
2. Create these two parameters:

| Name | Type | Value |
|------|------|-------|
| `/clothco/MONGO_URI` | SecureString | Your full Atlas URI |
| `/clothco/JWT_SECRET` | SecureString | `clothco_jwt_secret_btec_unit6_2024` |

---

## Step 3 — Create an ECR Repository

1. Go to **Elastic Container Registry → Create repository**
2. Name: `clothco`
3. Visibility: **Private**
4. Click **Create**
5. Copy the **repository URI** — looks like `123456789.dkr.ecr.eu-west-1.amazonaws.com/clothco`

---

## Step 4 — Create an ECS Cluster

1. Go to **Elastic Container Service → Clusters → Create cluster**
2. Cluster name: `clothco-cluster`
3. Infrastructure: **AWS Fargate (serverless)** ← no servers to manage
4. Click **Create**

---

## Step 5 — Register the Task Definition

1. Go to **ECS → Task Definitions → Create new task definition → Create new task definition with JSON**
2. Paste the contents of `ecs-task-definition.json` from the project
3. Replace every `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID (top-right corner of console)
4. Click **Create**

> The task definition uses **SSM Parameter Store** for secrets so your MongoDB URI
> is never stored in plaintext anywhere in AWS.

---

## Step 6 — Create an Application Load Balancer

1. Go to **EC2 → Load Balancers → Create load balancer → Application Load Balancer**
2. Name: `clothco-alb`
3. Scheme: **Internet-facing**
4. IP type: **IPv4**
5. VPC: choose your default VPC
6. Subnets: select **at least 2 availability zones**
7. Security group: create new → allow inbound **HTTP port 80** from `0.0.0.0/0`
8. **Listeners and routing:**
   - Protocol: HTTP, Port: 80
   - Default action: **Create target group**
     - Target type: **IP addresses** (required for Fargate)
     - Name: `clothco-tg`
     - Protocol: HTTP, Port: 3000
     - Health check path: `/api/v1/health`
     - Click **Create target group**
   - Back in ALB creation, select `clothco-tg` as the default action
9. Click **Create load balancer**
10. Copy the **DNS name** of the ALB — this is your app's public URL

---

## Step 7 — Create the ECS Service (with ALB + Auto Scaling)

1. Go to **ECS → clothco-cluster → Services → Create**
2. Settings:
   - Launch type: **Fargate**
   - Task definition: `clothco-task`
   - Service name: `clothco-service`
   - Desired tasks: `2` (minimum for high availability)
3. **Networking:**
   - VPC: default
   - Subnets: same ones as ALB
   - Security group: create new → allow inbound **TCP 3000** from the ALB security group only
   - Auto-assign public IP: **Enabled**
4. **Load balancing:**
   - Load balancer type: Application Load Balancer
   - Load balancer: `clothco-alb`
   - Container: `clothco-app:3000`
   - Target group: `clothco-tg`
5. **Service Auto Scaling:**
   - Turn on: **Use service auto scaling**
   - Minimum tasks: `1`
   - Maximum tasks: `6`
   - Add scaling policy:
     - Policy name: `clothco-cpu-scaling`
     - ECS service metric: **ECSServiceAverageCPUUtilization**
     - Target value: `60` (scale out when CPU > 60%)
     - Scale-in cooldown: `60` seconds
     - Scale-out cooldown: `30` seconds
6. Click **Create**

> AWS will now pull the Docker image from ECR, launch 2 containers across 2
> availability zones, and route traffic through the ALB automatically.

---

## Step 8 — Add GitHub Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

Add these 4 secrets:

| Secret name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From Step 1 |
| `AWS_SECRET_ACCESS_KEY` | From Step 1 |

> The region, cluster name, service name etc. are already hardcoded in
> `.github/workflows/deploy.yml` — change them there if needed.

---

## Step 9 — Give the ECS Task Role permission to read SSM

1. Go to **IAM → Roles → ecsTaskExecutionRole**
2. Attach policy: **AmazonSSMReadOnlyAccess**

---

## Step 10 — First deployment

Push to `main` on GitHub:

```bash
git add .
git commit -m "Add Docker + CI/CD pipeline"
git push origin main
```

Watch the pipeline run at: **GitHub repo → Actions tab**

Three jobs appear:
1. **Lint & Syntax Check** — runs node --check
2. **Build & Push Docker Image** — builds your Dockerfile, pushes to ECR
3. **Deploy to ECS Fargate** — updates the ECS service with the new image

When all three are green, visit the ALB DNS name — your app is live.

---

## Architecture Summary (for BTEC write-up)

| Component | AWS Service | Purpose |
|---|---|---|
| Container image | Amazon ECR | Stores versioned Docker images |
| Container runtime | ECS Fargate | Runs containers — no EC2 to manage |
| Load balancing | Application Load Balancer | Distributes traffic, health checks |
| Auto scaling | ECS Service Auto Scaling | Adds/removes containers based on CPU |
| Secrets management | SSM Parameter Store | Stores MONGO_URI and JWT_SECRET securely |
| CI/CD pipeline | GitHub Actions | Automates build → push → deploy on git push |
| Logging | CloudWatch Logs (`/ecs/clothco`) | Centralised container logs |
| Database | MongoDB Atlas | Managed, already connected |

**High availability:** 2 tasks minimum across 2 AZs. If one container fails,
the ALB health check (`/api/v1/health`) removes it and auto scaling replaces it.

**Zero-downtime deploys:** ECS rolling update — new containers must pass health
checks before old ones are terminated.
