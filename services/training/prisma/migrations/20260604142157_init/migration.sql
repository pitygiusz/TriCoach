-- CreateTable
CREATE TABLE "TrainingHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "distance_km" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "TrainingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_distance_km" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "TrainingPlans_pkey" PRIMARY KEY ("id")
);
