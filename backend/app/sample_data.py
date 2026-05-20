from app.schemas import (
    Bullet,
    Contact,
    EducationEntry,
    ExperienceEntry,
    ResumeData,
    SkillGroup,
)

SAMPLE_RESUME = ResumeData(
    contact=Contact(
        firstname="Alex",
        lastname="Rivera",
        headline="Senior Full-Stack Engineer",
        email="alex.rivera@example.com",
        phone="+1 555 0142",
        linkedin="alex-rivera-sample",
        github="alex-rivera-sample",
        website="https://alexrivera.example.com",
        address="Remote",
    ),
    summary=(
        "Full-stack engineer with eight years building data-heavy web products. "
        "Comfortable owning a feature from API design to production deployment, "
        "and most useful on small teams where a single person ships the whole stack."
    ),
    experience=[
        ExperienceEntry(
            title="Senior Software Engineer",
            company="Globex",
            location="Remote",
            date="Jun 2023 - Present",
            bullets=[
                Bullet(id="e1b1", text="Led the migration of the billing pipeline to event-sourced architecture, reducing reconciliation incidents by 80% across three regions."),
                Bullet(id="e1b2", text="Designed and shipped the public webhooks API used by 1,200+ integrations; built rate limiting, replay, and idempotency from scratch."),
                Bullet(id="e1b3", text="Mentored four engineers through their first quarter, two of whom were promoted within the year."),
            ],
        ),
        ExperienceEntry(
            title="Software Engineer",
            company="Acme Data",
            location="San Francisco, CA",
            date="Aug 2020 - May 2023",
            bullets=[
                Bullet(id="e2b1", text="Built a streaming ingest service in Go that processes 2.4 billion events per day at p99 < 50ms."),
                Bullet(id="e2b2", text="Cut analytics dashboard load time from 9s to 1.1s by introducing materialized views and a Redis cache layer."),
                Bullet(id="e2b3", text="Owned the on-call rotation for the ingest team; reduced page volume 60% through better alerting thresholds and runbooks."),
            ],
        ),
        ExperienceEntry(
            title="Software Engineer (Junior)",
            company="Initech",
            location="Austin, TX",
            date="Jul 2018 - Jul 2020",
            bullets=[
                Bullet(id="e3b1", text="Shipped the customer self-serve refunds flow, removing ~120 weekly support tickets."),
                Bullet(id="e3b2", text="Wrote the team's first end-to-end test suite (Playwright); caught three regressions before launch."),
            ],
        ),
    ],
    education=[
        EducationEntry(
            degree="M.S. Computer Science",
            institution="State University",
            location="Berkeley, CA",
            date="2016 - 2018",
            bullets=[
                Bullet(id="ed1b1", text="Thesis: low-latency consensus protocols under partial network partitions."),
            ],
        ),
        EducationEntry(
            degree="B.S. Computer Science",
            institution="State University",
            location="Berkeley, CA",
            date="2012 - 2016",
        ),
    ],
    skills=[
        SkillGroup(category="Languages", items=["Python", "TypeScript", "Go", "SQL"]),
        SkillGroup(category="Frameworks", items=["FastAPI", "React", "Django", "Next.js"]),
        SkillGroup(category="Infrastructure", items=["Docker", "Kubernetes", "Terraform", "AWS", "GCP"]),
        SkillGroup(category="Data", items=["PostgreSQL", "Redis", "Kafka", "ClickHouse"]),
    ],
)
