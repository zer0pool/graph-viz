# 🚀 Scalable GraphQL Coding Guide for FastAPI (Strawberry)

This guide outlines the standard architecture and best practices for building modular, robust, and maintainable GraphQL APIs using **FastAPI** and **Strawberry**, based on Domain-Driven Design (DDD) principles.

---

## 1. Modular Directory Structure (Domain-Driven Design)

For large-scale projects, putting all GraphQL types and resolvers into a single `schema.py` quickly becomes unmaintainable. Instead, we structure our GraphQL layer by **Domain (Feature)**.

```text
app/
├── main.py                 # FastAPI app & GraphQLRouter initialization
├── core/                   # Security, Database config, Global Constants
└── api/
    └── graphql/            # Root of GraphQL API presentation layer
        ├── schema.py           # Merges all domain Queries/Mutations into the root Schema
        ├── context.py          # Context getter (Dependency Injection: Auth, DB sessions)
        ├── dataloaders.py      # N+1 batching logic (DataLoaders)
        └── domains/            # Feature-specific modules
            ├── user/
            │   ├── types.py    # GraphQL Object Types (UserType)
            │   ├── inputs.py   # Mutation Input Types (CreateUserInput)
            │   ├── queries.py  # Query class for User domain
            │   ├── mutations.py# Mutation class for User domain
            │   └── service.py  # Optional: Domain-specific helper logic
            └── post/           # Repeat for other domains (e.g., Post, Analytics, Job)
```

**Why this structure?**
*   **High Cohesion:** Everything related to the `user` domain lives in one directory.
*   **Loose Coupling:** The root `schema.py` doesn't need to know the implementation details of every domain.
*   **Scalability:** Adding a new domain (e.g., `payment`) just means adding a new folder and a single import in `schema.py`.

🔗 *Official Ref: FastAPI Integration Guide*  
👉 https://strawberry.rocks/docs/integrations/fastapi

---

## 2. Defining Scalable Schemas

To keep your root schema clean, use **Class Inheritance** (or `strawberry.tools.merge_types`) to compose multiple domain-specific query classes into one unified GraphQL Schema.

### Domain-Specific Query
```python
# app/api/graphql/domains/user/queries.py
import strawberry
from typing import List
from .types import UserType

@strawberry.type
class UserQuery:
    @strawberry.field(description="Get a single user by ID")
    async def user(self, id: strawberry.ID) -> UserType:
        # Resolve logic here
        pass
        
    @strawberry.field(description="List all users")
    async def users(self) -> List[UserType]:
        # Resolve logic here
        pass
```

### Root Schema Composition
```python
# app/api/graphql/schema.py
import strawberry
from .domains.user.queries import UserQuery
from .domains.post.queries import PostQuery
# Import domain mutations similarly

# Merge all domain queries into the Root Query
@strawberry.type
class Query(UserQuery, PostQuery):
    pass

schema = strawberry.Schema(query=Query)
```
🔗 *Official Ref: Schema Definition Basics*  
👉 https://strawberry.rocks/docs/general/schema-basics

---

## 3. Performance: The N+1 Solution (DataLoaders)

In GraphQL, fetching related data (e.g., "Get 10 users, and for each user get their posts") can cause the dreaded **N+1 problem** (1 query for users + 10 queries for posts).

**Rule:** Never call the database directly inside a nested field resolver. Always use **DataLoaders** to batch and cache requests.

### Defining a DataLoader
```python
# app/api/graphql/dataloaders.py
from strawberry.dataloader import DataLoader
from typing import List

async def load_posts_by_user_ids(keys: List[int]) -> List[List[PostType]]:
    # DB Call: SELECT * FROM posts WHERE user_id IN (keys)
    # The return list MUST match the exact order and length of the keys!
    return await service.get_posts_for_users_in_batch(keys)

# It's recommended to instantiate loaders per-request via Context
```

### Injecting via Context
```python
# app/api/graphql/context.py
from strawberry.fastapi import BaseContext
from .dataloaders import load_posts_by_user_ids

class GraphQLContext(BaseContext):
    def __init__(self, db_session):
        self.db = db_session
        # New instance per request ensures data isn't leaked across requests
        self.post_loader = DataLoader(load_fn=load_posts_by_user_ids)

async def get_graphql_context(db=Depends(get_db_session)):
    return GraphQLContext(db_session=db)
```

🔗 *Official Ref: Using DataLoaders*  
👉 https://strawberry.rocks/docs/guides/dataloaders    

---

## 4. Input Validation & Type Safety

*   **Type Naming:** Always append `Type` (e.g., `UserType`) to your GraphQL types. This clearly distinguishes them from SQLAlchemy ORM models (e.g., `UserModel`).
*   **Inputs:** Use `@strawberry.input` for complex arguments passed to Queries or Mutations.
*   **Documentation:** Always provide descriptive `description` strings. They automatically appear in the GraphQL Playground/GraphiQL, acting as self-documenting APIs.

```python
import strawberry
from typing import Optional

@strawberry.input(description="Input payload for creating a new user")
class CreateUserInput:
    username: str = strawberry.field(description="Unique username")
    email: str = strawberry.field(description="Valid email address")
    age: Optional[int] = strawberry.field(default=None, description="Optional age")
```
🔗 *Official Ref: Object Types Reference*  
👉 https://strawberry.rocks/docs/types/object-types

---

## 5. Error Handling via Union Types (Best Practice)

Instead of raising generic HTTP 500 exceptions, GraphQL APIs should return **Action Results** using Union types. This gives the frontend strictly typed, predictable error shapes to handle gracefully (e.g., showing a specific inline error).

### Defining Errors
```python
import strawberry

@strawberry.type
class UserType:
    id: strawberry.ID
    username: str

@strawberry.type
class UserNotFoundError:
    message: str = "The requested user could not be found."

@strawberry.type
class UsernameTakenError:
    message: str = "This username is already in use."
```

### Using Unions in Mutations/Queries
```python
# Define the Union
UserResponse = strawberry.union(
    "UserResponse", 
    (UserType, UserNotFoundError, UsernameTakenError)
)

@strawberry.type
class UserMutation:
    @strawberry.mutation(description="Create a new user safely")
    async def create_user(self, input: CreateUserInput) -> UserResponse:
        user_exists = await check_user(input.username)
        if user_exists:
            return UsernameTakenError()
            
        new_user = await create_in_db(input)
        return UserType(id=new_user.id, username=new_user.username)
```
🔗 *Official Ref: Handling Errors with Union Types*  
👉 https://strawberry.rocks/docs/types/unions

---

## 6. Official References Collection

To explore further, rely on these verified official documentation pages:

*   **FastAPI GraphQL Official Guide:**  
    https://fastapi.tiangolo.com/how-to/graphql/
*   **Strawberry FastAPI Integration:**  
    https://strawberry.rocks/docs/integrations/fastapi
*   **Handling Errors with Union Types (Best Practice):**  
    https://strawberry.rocks/docs/types/unions
*   **DataLoaders (N+1 Solution):**  
    https://strawberry.rocks/docs/guides/dataloaders