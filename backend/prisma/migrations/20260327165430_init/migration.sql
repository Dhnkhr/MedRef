-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "bloodGroup" TEXT,
    "emergencyConsent" BOOLEAN NOT NULL DEFAULT false,
    "wearableConnected" BOOLEAN NOT NULL DEFAULT false,
    "wearableSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "notifyViaSMS" BOOLEAN NOT NULL DEFAULT true,
    "notifyViaPush" BOOLEAN NOT NULL DEFAULT true,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "EmergencyContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "phone" TEXT,
    "specialists" TEXT NOT NULL DEFAULT '[]',
    "rating" REAL NOT NULL DEFAULT 0,
    "emergencyRating" REAL NOT NULL DEFAULT 0,
    "hasTraumaCenter" BOOLEAN NOT NULL DEFAULT false,
    "hasBloodBank" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BedAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL,
    "generalTotal" INTEGER NOT NULL DEFAULT 0,
    "generalAvailable" INTEGER NOT NULL DEFAULT 0,
    "icuTotal" INTEGER NOT NULL DEFAULT 0,
    "icuAvailable" INTEGER NOT NULL DEFAULT 0,
    "nicuTotal" INTEGER NOT NULL DEFAULT 0,
    "nicuAvailable" INTEGER NOT NULL DEFAULT 0,
    "ventilatorTotal" INTEGER NOT NULL DEFAULT 0,
    "ventilatorAvailable" INTEGER NOT NULL DEFAULT 0,
    "otTotal" INTEGER NOT NULL DEFAULT 0,
    "otAvailable" INTEGER NOT NULL DEFAULT 0,
    "emergencyTotal" INTEGER NOT NULL DEFAULT 0,
    "emergencyAvailable" INTEGER NOT NULL DEFAULT 0,
    "avgWaitTime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BedAvailability_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "extractedMedications" TEXT,
    "extractedDiagnosis" TEXT NOT NULL DEFAULT '[]',
    "ipfsHash" TEXT NOT NULL,
    "encryptionKey" TEXT NOT NULL,
    "scannedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidenceScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inputData" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "urgencyLevel" TEXT,
    "hospitalId" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnalysisHistory_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SOSEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "contactsNotified" INTEGER NOT NULL DEFAULT 0,
    "emergencyFlowTriggered" BOOLEAN NOT NULL DEFAULT false,
    "autoConsent" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SOSEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QRSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QRSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ConsentAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainEventId" INTEGER,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "patientId" TEXT NOT NULL,
    "accessorId" TEXT,
    "consentType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "ipHash" TEXT,
    "metadataIpfsHash" TEXT,
    "syncedToChain" BOOLEAN NOT NULL DEFAULT false,
    "syncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" DATETIME,
    CONSTRAINT "ConsentAuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE INDEX "Patient_email_idx" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BedAvailability_hospitalId_key" ON "BedAvailability"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "QRSession_referenceId_key" ON "QRSession"("referenceId");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_patientId_idx" ON "ConsentAuditLog"("patientId");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_referenceId_idx" ON "ConsentAuditLog"("referenceId");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_consentType_action_idx" ON "ConsentAuditLog"("consentType", "action");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_syncedToChain_idx" ON "ConsentAuditLog"("syncedToChain");
