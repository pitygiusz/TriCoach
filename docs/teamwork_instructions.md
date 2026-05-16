# 📘 TriCoach: Engineering Team Playbook & Workflow Guide

## 🏗️ Phase 0: One-Time Project Initialization

*To be executed by a single repository administrator (e.g., Piotr) to set up the baseline shared environment.*

1. **Google Cloud Platform (GCP) Configuration:**
* Create a new GCP project and record the unique `Project ID` (e.g., `tricoach-app-2026`).
* Navigate to **IAM & Admin > IAM**, select **Grant Access**, and invite team members (Jan and Tomasz) using their Google accounts. Assign them the **Editor** role.
* Ensure an active **Billing Account** is linked to the project to authorize Cloud SQL and Cloud Run provisioning.
* Create a dedicated **Cloud Storage Bucket** (e.g., `tricoach-tf-state-shared`) exclusively to host the remote Terraform state file.


2. **Version Control Setup (GitHub):**
* Initialize a centralized, private Git repository (e.g., `tricoach-monorepo`).
* Commit the standard `.gitignore` file to the root directory.
* Add the master `main.tf` file, ensuring the `backend "gcs"` block correctly references the newly created Cloud Storage bucket name.
* Push the initial commit to the remote repository.



---

## 💻 Phase 1: Local Workspace Configuration

*To be executed independently by every team member during initial onboarding.*

1. Clone the remote repository to your local machine:
```bash
git clone <repository-url>

```


2. Authenticate your local environment with Google Cloud using Application Default Credentials (ADC):

```bash
   gcloud auth application-default login

```

3. Navigate to the `terraform/` directory, create a local variables file named **`terraform.tfvars`**, and specify the shared Project ID:

```hcl
   project_id = "YOUR_SHARED_GCP_PROJECT_ID"

```

*(Note: This file is strictly excluded by `.gitignore` and must be created manually on each machine).*
4. Initialize the Terraform workspace to establish the connection with the remote GCS backend and download the required cloud providers:

```bash
terraform init

```

---

## 🔄 Phase 2: On-Demand Cloud Infrastructure Lifecycle

To conserve the student education credits and maximize cost efficiency, the team operates on an "on-demand infrastructure" model. Cloud resources are only running during active joint development windows.

**Step 1: Session Initiation**

1. Pull the latest codebase amendments from the main branch:

```bash
   git pull

```

2. Deploy the architecture to GCP:

```bash
   terraform apply

```

3. Once completed, extract the live PostgreSQL instance IP addresses and microservice base URLs exposed in the terminal outputs.

**Step 2: Microservice Environmental Binding**
Update your local, untracked `.env` configuration files inside your microservice subdirectories to target the live GCP infrastructure:

```env
DB_HOST=extracted_cloud_sql_ip_address
DB_USER=tricoachadmin
DB_PASSWORD=generated_secure_password

```

**Step 3: Session Termination & Resource Destruction**
To prevent idle infrastructure costs from depleting the shared budget overnight, the engineer ending the development session must execute a complete teardown:

```bash
terraform destroy

```

---

## 👨‍💻 Phase 3: Monorepo Codebase & Architecture Design

The project implements a **Monorepo** structure. All application code, frontend assets, and infrastructure definitions live in a single unified workspace.

```text
tricoach-monorepo/
├── .gitignore
├── terraform/               <-- Terraform configuration (main.tf)
├── frontend/                <-- React User Interface application
├── docker-compose.yml       <-- Local Docker environment orchestration
└── services/                <-- Backend core microservices (Node.js/TypeScript)
    ├── api-gateway/         (Port 3000)
    ├── user-service/        (Port 3001)
    └── training-service/    (Port 3002)

```

### Engineering Strategy 1: Remote Cloud Integration Testing

Run the Node.js/TypeScript microservices locally in development mode (e.g., `npm run dev`) while binding their environment variables to the live PostgreSQL and Firestore endpoints running in GCP.

### Engineering Strategy 2: Isolated Local Emulation (Recommended)

To bypass cloud latency and deployment wait times during rapid prototyping, developers can use **Docker Compose**. By executing `docker-compose up` in the root directory, Docker spins up a localized, simulated environment (including a local PostgreSQL instance and microservices) on `localhost`.

---

## 🚀 Phase 4: Container Deployment (CI/CD Baseline)

When a microservice achieves a stable iteration ready for persistent testing, the container image must be built and shipped to the Cloud Run hosting layer.

1. Compile and tag the Docker container image targeting the **Artifact Registry** registry:

```bash
   docker build -t europe-central2-docker.pkg.dev/YOUR_PROJECT_ID/tricoach-repo/user-service:v1 .

```

2. Push the compiled image to your private GCP registry:

```bash
   docker push europe-central2-docker.pkg.dev/YOUR_PROJECT_ID/tricoach-repo/user-service:v1

```

3. Deploy the new image revision to Cloud Run via the GCP Console or CLI to immediately update the live endpoint.

---

## 🛑 Strict Engineering Guidelines

1. **Zero Secret Leakage Policy:** Under no circumstances should `.tfstate`, `.env`, or `terraform.tfvars` files be committed to version control. All credentials must be passed dynamically or through localized environmental injection.
2. **Shared State Locking:** Coordinate with the team on communication channels before executing structural infrastructure updates to avoid write collisions on the remote state file.
3. **Commit Clean Code:** Validate all endpoints locally using your isolated emulation environment before testing against the live cloud infrastructure.

