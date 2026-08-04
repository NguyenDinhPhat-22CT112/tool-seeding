import { PrismaClient, OrgRole } from "@prisma/client";

const prisma = new PrismaClient();

const demoOrganizations = [
  {
    id: "org_demo",
    name: "Demo Organization",
    slug: "demo-organization",
  },
  {
    id: "org_demo_other",
    name: "Other Demo Organization",
    slug: "other-demo-organization",
  },
];

const demoUsers = [
  {
    id: "user_demo_001",
    email: "admin@demo.io",
    fullName: "Demo Admin",
  },
  {
    id: "user_demo_002",
    email: "analyst@demo.io",
    fullName: "Demo Analyst",
  },
  {
    id: "user_demo_003",
    email: "reviewer@demo.io",
    fullName: "Demo Reviewer",
  },
  {
    id: "user_demo_004",
    email: "viewer@demo.io",
    fullName: "Demo Viewer",
  },
];

// userId -> role trong org_demo. Chỉ seed membership cho org_demo.
const demoMemberships: Record<string, string> = {
  user_demo_001: "ORG_ADMIN",
  user_demo_002: "ANALYST",
  user_demo_003: "INSIGHT_REVIEWER",
  user_demo_004: "VIEWER",
};

async function main() {
  for (const organization of demoOrganizations) {
    await prisma.organization.upsert({
      where: { slug: organization.slug },
      update: { name: organization.name, isActive: true, deletedAt: null },
      create: organization,
    });
  }

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        fullName: user.fullName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...user,
        passwordHash: "stub-no-auth",
        isActive: true,
      },
    });
  }

  for (const [userId, role] of Object.entries(demoMemberships)) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: "org_demo",
          userId,
        },
      },
      update: { role: role as OrgRole, isActive: true },
      create: {
        organizationId: "org_demo",
        userId,
        role: role as OrgRole,
        isActive: true,
      },
    });
  }

  console.log("Demo organizations are ready:");
  console.log("- org_demo");
  console.log("- org_demo_other");
  console.log("Demo users are ready:");
  console.log("- user_demo_001 (ORG_ADMIN)");
  console.log("- user_demo_002 (ANALYST)");
  console.log("- user_demo_003 (INSIGHT_REVIEWER)");
  console.log("- user_demo_004 (VIEWER)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
