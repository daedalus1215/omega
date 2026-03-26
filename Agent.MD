# Architectural Conventions for Chronus

## Project Overview

This is a monorepo with a **NestJS backend** and **React frontend** using DDD, Hexagonal Architecture, and Layered Architecture.

---

## Backend Architecture

### Directory Structure

```
src/
├── {module-name}/
│   ├── application/           # Controllers, DTOs, request/response handling
│   │   ├── controllers/
│   │   │   └── actions/
│   │   │       └── {action-name}/
│   │   │           ├── {action-name}.action.ts
│   │   │           ├── {action-name}.swagger.ts
│   │   │           └── {action-name}.responder.ts
│   │   └── dtos/
│   │       ├── requests/{dto-name}.dto.ts
│   │       └── responses/{dto-name}.dto.ts
│   ├── domain/                # Core business logic
│   │   ├── services/{service-name}.service.ts
│   │   ├── transaction-scripts/{transaction-name}-ts/
│   │   │   ├── {transaction-name}.transaction.script.ts
│   │   │   ├── {transaction-name}.param.ts
│   │   │   └── __specs__/{transaction-name}.transaction.script.spec.ts
│   │   ├── entities/{entity-name}.entity.ts
│   │   ├── exceptions/
│   │   ├── converters/
│   │   └── aggregators/
│   ├── infrastructure/         # Data access, external adapters
│   │   └── repositories/{repository-name}.repository.ts
│   ├── registries/           # Module wiring
│   └── {module}.module.ts
└── shared/shared-entities/    # Cross-domain entities
```

### Module Interaction Flow

1. **Action** receives request → validates input
2. **Action** calls **Service** (never transaction script directly)
3. **Service** uses **Aggregator** for cross-domain logic
4. **Service** delegates to **Transaction Script** for business operation
5. **Transaction Script** uses **Repositories** for data access
6. **Responder** maps entity to response DTO

### Dependency Rules

| Component | Can Inject | Cannot Inject |
|-----------|-----------|---------------|
| Converters | Nothing | Repositories, Transaction Scripts, Services, other Converters |
| Assemblers | Converters, Repositories (shallow) | Transaction Scripts, Services, Mappers |
| Mappers | Assemblers, Converters, Repositories | Transaction Scripts, Services |
| Transaction Scripts | Repositories, Mappers, Aggregators, Converters* | Services, other Transaction Scripts |
| Domain Services | Transaction Scripts, Aggregators, Repositories | Services, Mappers, Converters |
| Aggregators | Transaction Scripts, Repositories | Services, other Aggregators |
| Repositories | TypeORM Repository | Transaction Scripts, Services, Converters |

*Only if Converter is NOT used by a Mapper (Blackbox Principle)

### Key Rules

1. **No Same-Level Injection** - Transaction Scripts don't inject other Transaction Scripts; use Domain Service or Aggregator instead
2. **Blackbox Principle** - If a lower pattern is used by an intermediate pattern, the higher pattern uses the intermediate, not the lower one
3. **Domain Boundaries** - Entities stay within their domain; use Aggregators for cross-domain communication
4. **Transaction Scripts** - All domain logic lives here
5. **Join Entities in Shared-Kernel** - Many-to-many join tables belong in `shared-kernel/domain/entities/`

---

## Blackbox Principle

The Blackbox Principle ensures that higher-level patterns don't need to know about the internal composition of lower-level patterns.

### Rule
If a pattern A uses pattern B, and pattern B uses pattern C, then pattern A should only know about pattern B. Pattern B becomes a **blackbox**.

### Dependency Hierarchy

```
Entry Points (Application Layer)
    ↓
Domain Services
    ↓
Aggregators (via ports)
    ↓
Transaction Scripts
    ↓
Mappers
    ↓
Assemblers
    ↓
Converters (cannot have any dependencies)
    ↓
Repositories (shallow, data only)
    ↓
Dispatchers / RemoteCallers
```

### Correct Pattern

```typescript
// Converter used by Mapper - Mapper is blackbox
@Injectable()
export class InvoiceToDtoConverter {
  apply(entity: Invoice): InvoiceDto {
    return {
      id: entity.id,
      total: Number(entity.total),
      balanceDue: Number(entity.balanceDue),
    };
  }
}

@Injectable()
export class InvoiceWithPaymentsMapper {
  constructor(private readonly invoiceToDtoConverter: InvoiceToDtoConverter) {}
  
  map(invoice: Invoice, payments: Payment[]): InvoiceWithPaymentsDto {
    return {
      invoice: this.invoiceToDtoConverter.apply(invoice),
      payments: payments.map(p => ({ id: p.id, amount: p.amount })),
    };
  }
}

@Injectable()
export class GetInvoiceWithPaymentsTransactionScript {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly paymentRepository: PaymentApplicationRepository,
    private readonly invoiceWithPaymentsMapper: InvoiceWithPaymentsMapper, // ✅ Uses Mapper, not Converter
  ) {}

  async execute(invoiceId: number): Promise<InvoiceWithPaymentsDto> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    const payments = await this.paymentRepository.findByInvoiceId(invoiceId);
    return this.invoiceWithPaymentsMapper.map(invoice, payments);
  }
}
```

### Incorrect Pattern

```typescript
// ❌ Transaction Script should NOT directly use Converter if Mapper uses it
@Injectable()
export class GetInvoiceWithPaymentsTransactionScript {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceWithPaymentsMapper: InvoiceWithPaymentsMapper,
    private readonly invoiceToDtoConverter: InvoiceToDtoConverter, // ❌ Converter already used by Mapper
  ) {}
}
```

### Exception
If a Converter is **NOT** used by any Mapper/Assembler, then a Transaction Script can use it directly.

---

## Cross-Domain Communication Rules

### No Cross-Domain Pollination

Entities from one domain should **NOT** directly reference entities from another domain. Use Aggregators and ports for cross-domain communication.

### Correct Pattern

```typescript
// Invoice entity in invoices domain - NO reference to Payment
@Entity({ name: 'invoices' })
export class Invoice {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;
  
  // No @OneToMany(() => Payment, ...) here
}

// Use Aggregator for cross-domain access
@Injectable()
export class InvoiceService {
  constructor(
    private readonly cancelInvoiceTransactionScript: CancelInvoiceTransactionScript,
    private readonly paymentAggregator: PaymentAggregator, // ✅ Via aggregator
  ) {}

  async cancelInvoice(invoiceId: number, issuerUserId: number): Promise<Invoice> {
    const hasPayments = await this.paymentAggregator.hasPaymentApplications(invoiceId);
    if (hasPayments) {
      throw new Error('Cannot cancel invoice with payments');
    }
    return await this.cancelInvoiceTransactionScript.execute(invoiceId);
  }
}
```

### Incorrect Pattern

```typescript
// ❌ Cross-domain entity reference
@Entity({ name: 'invoices' })
export class Invoice {
  @OneToMany(() => Payment, (payment) => payment.invoice) // ❌ Payment is in payments domain
  payments!: Payment[];
}
```

### Join Entities Exception

Many-to-many join tables belong in `shared-kernel/domain/entities/`:

```typescript
// shared-kernel/domain/entities/tag-note.entity.ts
@Entity({ name: 'tag_notes' })
export class TagNote {
  @PrimaryColumn({ name: 'tag_id' })
  tagId: number;
  
  @PrimaryColumn({ name: 'note_id' })
  noteId: number;
}
```

Rationale: Join entities don't represent business concepts; they exist purely for persistence. Neither domain "owns" the relationship.

### Cross-Domain Aggregator Usage

```typescript
// payments/domain/aggregators/payment.aggregator.ts
@Injectable()
export class PaymentAggregator {
  constructor(
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async hasPaymentApplications(invoiceId: number): Promise<boolean> {
    const applications = await this.paymentApplicationRepository.findByInvoiceId(invoiceId);
    return applications.length > 0;
  }
}

// invoices/domain/services/invoice.service.ts
@Injectable()
export class InvoiceService {
  constructor(
    private readonly paymentAggregator: PaymentAggregator, // ✅ Direct injection from other domain
  ) {}
}
```

---

## TypeScript Coding Guidelines

### Function Guidelines

- **Maximum 20 instructions** per function
- **Single purpose** - each function does one thing
- **Name with verbs** - `createInvoice`, `findById`, `hasPaymentApplications`
- **Use verbs for booleans** - `isLoading`, `hasError`, `canDelete`
- **Reduce parameters using RO-RO** (Release-Request/Response Object pattern)
  - Use objects to pass multiple parameters
  - Use objects to return results

```typescript
// ❌ Too many parameters
async createInvoice(userId: number, debtorId: number, amount: number, dueDate: Date, description: string): Promise<Invoice>

// ✅ Use object parameter
async createInvoice(dto: CreateInvoiceRequestDto): Promise<Invoice>
```

### Class Guidelines

- **Maximum 200 instructions** per class
- **Maximum 10 public methods** per class
- **Maximum 10 properties** per class
- **Single responsibility** - one reason to change

### Variable Naming

| Type | Pattern | Example |
|------|---------|---------|
| Boolean | is/has/can prefix | `isLoading`, `hasError`, `canDelete` |
| Collection | plural or suffix | `users`, `invoiceItems` |
| Constants | UPPERCASE with underscores | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Test variables | inputX, mockX, actualX, expectedX | `inputDto`, `mockRepository` |

### Data Immutability

- **Use `const`** instead of `let` wherever possible
- **Use `readonly`** for class properties that don't change
- **Use `as const`** for literal values

```typescript
const CONFIG = { timeout: 5000 } as const;
readonly MAX_ITEMS = 100;
```

### Error Handling

- Use exceptions for unexpected errors
- Catch exceptions to fix expected problems or add context
- Use global exception handler for unexpected errors
- Use early returns to avoid nesting

```typescript
// ❌ Deep nesting
if (entity) {
  if (isValid) {
    if (hasPermission) {
      // do something
    }
  }
}

// ✅ Early returns
if (!entity) {
  throw new NotFoundException('Entity not found');
}
if (!isValid) {
  throw new BadRequestException('Invalid data');
}
if (!hasPermission) {
  throw new ForbiddenException('Access denied');
}
// do something
```

### Imports

- One export per file
- Group imports: external → internal → relative
- Use path aliases (`@/` for src paths)

---

## Pattern Glossary

### Transaction Script
Encapsulates a single business transaction. Named `{feature}.transaction.script.ts`.

```typescript
@Injectable()
export class CreateInvoiceTransactionScript {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  async execute(dto: CreateInvoiceRequestDto, issuerUserId: number): Promise<Invoice> {
    // Business logic here
  }
}
```

### Domain Service
Orchestrates business logic, coordinates Transaction Scripts. Named `{feature}.service.ts`.

```typescript
@Injectable()
export class InvoiceService {
  constructor(
    private readonly createInvoiceTransactionScript: CreateInvoiceTransactionScript,
    private readonly paymentAggregator: PaymentAggregator,
  ) {}

  async createInvoice(dto: CreateInvoiceRequestDto, issuerUserId: number): Promise<Invoice> {
    return await this.createInvoiceTransactionScript.execute(dto, issuerUserId);
  }
}
```

### Aggregator
Provides domain-specific operations for cross-domain communication.

```typescript
@Injectable()
export class PaymentAggregator {
  constructor(
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async hasPaymentApplications(invoiceId: number): Promise<boolean> {
    // Cross-domain query logic
  }
}
```

### Repository
Handles persistence. Wraps TypeORM repositories.

```typescript
@Injectable()
export class InvoiceRepository {
  constructor(@InjectRepository(Invoice) private readonly repository: Repository<Invoice>) {}

  async findById(id: number): Promise<Invoice | null> {
    return this.repository.findOne({ where: { id } });
  }
}
```

### Entity
TypeORM entity representing domain object. Located in `domain/entities/` or `shared/shared-entities/entities/`.

```typescript
@Entity({ name: 'invoices' })
export class Invoice {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;
  
  @Column({ name: 'issuer_user_id', type: 'int' })
  issuerUserId: number;
}
```

---

## Frontend Architecture

### Tech Stack
- React with TypeScript
- MUI (Material UI) for components
- Tailwind CSS for styling
- React Query for data fetching

### Coding Conventions

1. **Styling**: Use Tailwind classes exclusively; avoid CSS or tags
2. **Components**: Use descriptive names; event handlers prefixed with `handle` (e.g., `handleClick`)
3. **Accessibility**: Include `tabindex`, `aria-label`, keyboard handlers on interactive elements
4. **Immutability**: Use `const` instead of `let`; use `as const` for literals
5. **Early Returns**: Use early returns to reduce nesting
6. **Class Tags**: Use `class:` instead of ternary operators where possible
7. **TypeScript**: Avoid `any`; declare types for all variables and functions

### Component Patterns

```typescript
// Event handlers
const handleClick = () => { /* ... */ };

// Boolean variables
const isLoading = true;
const hasError = false;

// Component with props
interface ComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<ComponentProps> = ({ title, onAction }) => {
  return (
    <button 
      onClick={onAction}
      aria-label={title}
      tabIndex={0}
    >
      {title}
    </button>
  );
};
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `InvoiceService`, `UserRepository` |
| Variables/Functions | camelCase | `createInvoice`, `userId` |
| Files/Directories | kebab-case | `create-invoice.action.ts`, `user-repository.ts` |
| Environment Variables | UPPERCASE | `DATABASE_URL`, `API_KEY` |
| Types/Interfaces | PascalCase | `InvoiceDto`, `UserResponse` |
| Boolean Variables | is/has/can prefix | `isLoading`, `hasError`, `canDelete` |
| Test Variables | inputX, mockX, actualX, expectedX | `inputUser`, `mockRepository` |

---

## Testing Conventions

### Backend Tests (Jest)
- Follow **Arrange-Act-Assert** pattern
- Place tests in `__specs__/` folder next to the file being tested
- Name test subjects as `target`
- Write unit tests for each public function
- Write acceptance tests for each module

```typescript
describe('CreateInvoiceTransactionScript', () => {
  it('should create invoice with valid data', async () => {
    // Arrange
    const inputDto = { debtorUserId: 2, amount: 100, dueDate: '2024-12-31' };
    
    // Act
    const actual = await target.execute(inputDto, 1);
    
    // Assert
    expect(actual.id).toBeDefined();
  });
});
```

### Frontend Tests
- Test public component interfaces
- Mock external dependencies
- Test error states and edge cases

---

## UI/UX Guidelines

1. **Visual Hierarchy** - Clear hierarchy to guide user attention
2. **Consistency** - Maintain consistent style, terminology, and element positioning
3. **Accessibility** - Follow WCAG 2.1 AA standards; ensure keyboard navigation
4. **Feedback** - Loading indicators, clear error messages, success confirmations
5. **Mobile-First** - Design for mobile first, scale up; use responsive breakpoints
6. **Touch Targets** - Minimum 44x44 pixels for interactive elements

---

## DDD + TypeORM Pattern

| Layer | TypeORM | Cross-Domain Imports | Business Logic |
|-------|---------|---------------------|----------------|
| Domain | No | No | Yes |
| Infrastructure | Yes | Yes (infra only) | No |

**Domain Layer**: Pure TypeScript, no TypeORM decorators
**Infrastructure Layer**: TypeORM entities, repositories, database logic
**Mapping Layer**: Converts between domain entities and TypeORM entities

---

## Design Principles

1. **Functional Cohesion** - Each class/module has single, well-defined responsibility
2. **Loose Coupling** - Aggregators decouple services from other domains
3. **SOLID Principles** - Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
4. **Functional Paradigm** - Prefer `const`, use `map` over loops, avoid mutating variables
5. **Larry Constantine's Structured Design** - Minimize coupling, maximize cohesion
