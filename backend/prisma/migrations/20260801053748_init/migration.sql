-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "website" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "keystrokes" INTEGER NOT NULL,
    "scrollDepth" INTEGER NOT NULL,
    "tabSwitches" INTEGER NOT NULL,
    "aiSummary" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
