# TriCoach: Engineering Team Playbook & Workflow Guide

## Phase 0: One-Time Project Initialization (Administrator Only)

*To be executed by a single repository administrator (e.g., Piotr) to set up the baseline shared environment. This is done only once.*

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

3. **Initial Infrastructure Deployment:**

* Authenticate locally and run `terraform init` followed by `terraform apply`.
* Once the infrastructure is successfully provisioned, extract the live PostgreSQL instance IP address and the generated database password from the terminal outputs.
* Securely share these credentials (IP and password) with the rest of the team via a secure communication channel. Since the infrastructure will run 24/7, these credentials will remain static.

---

## Phase 1: Local Workspace Configuration (Every Team Member)

*To be executed independently by every team member (Piotr, Jan, Tomasz) during their initial onboarding to the project.*

1. **Repository & Authentication:**

* Clone the remote repository to your local machine:

```bash
git clone <repository-url>

```

* Authenticate your local environment with Google Cloud using Application Default Credentials (ADC):

```bash
gcloud auth application-default login

```

2. **Terraform Synchronization (Optional but Recommended):**

* Navigate to the `terraform/` directory, create a local variables file named **`terraform.tfvars`**, and specify the shared Project ID:

```hcl
project_id = "YOUR_SHARED_GCP_PROJECT_ID"

```

*(Note: This file is strictly excluded by `.gitignore` and must be created manually on each machine).*

* Initialize the Terraform workspace to establish the connection with the remote GCS backend:

```bash
terraform init

```

*(Note: You do not need to run `terraform apply` because the administrator has already provisioned the always-on infrastructure).*

3. **Microservice Environmental Binding:**

* Inside your microservice subdirectories, create a local, untracked `.env` configuration file.
* Populate it with the live GCP infrastructure credentials provided by the administrator:

```env
DB_HOST=extracted_cloud_sql_ip_address
DB_USER=tricoachadmin
DB_PASSWORD=provided_secure_password

```

---

## Phase 2: Daily Development Workflow (Always-On Infrastructure)

Because the operational cost of the selected architecture is well within the allocated educational budget, the cloud infrastructure (including the Cloud SQL database) operates continuously (24/7).

**Step 1: Session Initiation**

* Pull the latest codebase amendments from the main branch to ensure you are working with the most recent code:

```bash
git pull

```

**Step 2: Active Development**

* Write your code and test it locally. Your local Node.js services will connect directly to the live GCP database using the credentials in your `.env` file, or to your local Docker Compose database.

**Step 3: Code Commits**

* Once a feature is complete and tested, commit and push your changes to the shared repository:

```bash
git add .
git commit -m "Brief description of the implemented feature"
git push

```

---

## Phase 3: Monorepo Codebase & Architecture Design

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

To bypass cloud latency during rapid prototyping, developers can use **Docker Compose**. By executing `docker-compose up` in the root directory, Docker spins up a localized, simulated environment (including a local PostgreSQL instance and microservices) on `localhost`.

---

Dlaczego jeszcze nie widzisz tych usług w panelu Cloud Run (co potwierdza Twój zrzut ekranu)?

Odpowiedź kryje się w logach, które wkleiłeś: napis **`Creating...`** oznacza, że Terraform **jest w trakcie ich budowania**. Musisz poczekać na zielony komunikat **`Apply complete!`** na samym końcu terminala. Terraform czeka również na utworzenie bazy danych SQL (`google_sql_database_instance.sql_instance: Creating...`), co z reguły zajmuje od 5 do 10 minut. Gdy proces się zakończy, po prostu kliknij przycisk "Refresh" (ten po prawej stronie na Twoim screenie), a cała szóstka natychmiast się pojawi!

Oto zaktualizowana, profesjonalna i napisana po angielsku **Faza 4** (bez emotikon), opisująca nową integrację bezpośrednio z przyciskiem "Connect repo", którą możecie wkleić do Waszego playbooka na GitHubie:

---

## Phase 4: Automated CI/CD Deployment (GitHub Integration)

Instead of manually building and pushing Docker containers, the team utilizes Google Cloud Build to establish a Continuous Integration and Continuous Deployment (CI/CD) pipeline directly from the GitHub repository.

**Prerequisite:** Ensure that each microservice directory within the monorepo contains a valid, tested `Dockerfile` (e.g., located at `/services/user-service/Dockerfile`).

1. **Locate the Provisioned Services:**
Navigate to the **Cloud Run** section in the Google Cloud Console. Wait for the initial Terraform deployment to finish provisioning the placeholder services.
2. **Establish the Repository Connection:**
Select a specific microservice from the list (e.g., `tricoach-user`). Click the **Set up Continuous Deployment** option (or the **Connect repo** button at the top of the Cloud Run dashboard).
3. **Authenticate and Select Branch:**
Authorize Google Cloud Build to access your GitHub account. Select the shared `tricoach-monorepo` repository and designate the production branch (typically `main`).
4. **Configure Monorepo Build Settings (Crucial Step):**
Because all services reside in a single repository, you must explicitly define the build context for the selected service. In the build configuration menu, specify the exact path to the `Dockerfile` corresponding to that specific microservice (e.g., `/services/user-service/Dockerfile`).
5. **Deploy and Automate:**
Save the configuration. Google Cloud Build will immediately trigger an initial deployment using the source code. Moving forward, every `git push` to the designated branch will automatically trigger a new build and seamlessly update the live Cloud Run endpoint with zero downtime.

Repeat steps 2 through 5 for the remaining five microservices to fully automate the deployment pipeline across the entire backend architecture.

---

## Strict Engineering Guidelines

1. **Zero Secret Leakage Policy:** Under no circumstances should `.tfstate`, `.env`, or `terraform.tfvars` files be committed to version control. All credentials must be passed dynamically or through localized environmental injection.
2. **Shared State Locking:** Coordinate with the team on communication channels before executing structural infrastructure updates via Terraform to avoid write collisions on the remote state file.
3. **Commit Clean Code:** Validate all endpoints locally using your isolated emulation environment before deploying containers to the live cloud infrastructure.