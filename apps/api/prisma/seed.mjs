import { PrismaClient } from "@prisma/client";

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

try {
  for (const organization of demoOrganizations) {
    await prisma.organization.upsert({
      where: { slug: organization.slug },
      update: { name: organization.name, isActive: true, deletedAt: null },
      create: organization,
    });
  }

  console.log("Demo organizations are ready:");
  console.log("- org_demo");
  console.log("- org_demo_other");
} finally {
  await prisma.$disconnect();
}
