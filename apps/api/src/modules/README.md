# Business modules

Mỗi bounded context là một thư mục độc lập:

```text
<module>/
├── application/       # use cases, commands, queries, ports
├── domain/            # entities, value objects, domain services/events
├── infrastructure/    # persistence, messaging, external adapters
├── presentation/      # REST controllers, DTO mapping
├── <module>.module.ts # public composition boundary
└── index.ts           # public API được module khác phép dùng
```

Không import file nội bộ của module khác. Giao tiếp đồng bộ qua public API; giao tiếp không đồng bộ qua domain/application events.
