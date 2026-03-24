

1. 문제점 수정 ( 디비 접근 실패 현상 )
2. 지금 디비 세션 사용 방법에 문제가 없는지 검토 필요. 
3. 문제점 원인 및 수정 필요. 


문제점 재현 .. 

1. TEST_JOB_10 을 등록하고 소스를 따라 왼쪽의 노드를 반복 EXPAND 실행함
2. 계속 EXPAND하다보면 아래와 같이 에러 발생. 


  raise EndOfStream from None
anyio.EndOfStream

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/core/middleware.py", line 36, in session_middleware
    response = await call_next(request)
               ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 163, in call_next
    raise app_exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 149, in coro
    await self.app(scope, receive_or_disconnect, send_no_error)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 735, in app
    await route.handle(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 288, in handle
    await self.app(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 76, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 73, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 301, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/to_thread.py", line 56, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 2485, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 976, in run
    result = context.run(func, *args)
             ^^^^^^^^^^^^^^^^^^^^^^^^
  File "src/dependency_injector/_cwiring.pyx", line 28, in dependency_injector._cwiring._get_sync_patched._patched
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/api/v1/endpoints/expand.py", line 34, in expand
    return svc.get_table_neighbors_by_dbid(db_id=node_db_id, level=depth, direction=direction, limit=limit)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/services/graph_query_service.py", line 117, in get_table_neighbors_by_dbid
    table = self.uow.tables.get_by_id(db_id)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/repositories/table_repository.py", line 44, in get_by_id
    return self.db.execute(
           ^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2308, in execute
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2190, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/context.py", line 293, in orm_execute_statement
    result = conn.execute(
             ^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1416, in execute
    return meth(
           ^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/sql/elements.py", line 516, in _execute_on_connection
    return connection._execute_clauseelement(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1639, in _execute_clauseelement
    ret = self._execute_context(
          ^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
    return self._exec_single_context(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
    self._handle_dbapi_exception(
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2346, in _handle_dbapi_exception
    raise exc_info[1].with_traceback(exc_info[2])
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 922, in do_execute
    cursor.execute(statement, parameters)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 153, in execute
    result = self._query(query)
             ^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 322, in _query
    conn.query(q)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 575, in query
    self._affected_rows = self._read_query_result(unbuffered=unbuffered)
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 826, in _read_query_result
    result.read()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1210, in read
    self._read_result_packet(first_packet)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1286, in _read_result_packet
    self._get_descriptions()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1402, in _get_descriptions
    assert eof_packet.is_eof_packet(), "Protocol error, expecting EOF"
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Protocol error, expecting EOF

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1119, in _rollback_impl
    self.engine.dialect.do_rollback(self.connection)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 692, in do_rollback
    dbapi_connection.rollback()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 505, in rollback
    self._read_ok_packet()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 465, in _read_ok_packet
    pkt = self._read_packet()
          ^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 764, in _read_packet
    raise err.InternalError(
pymysql.err.InternalError: Packet sequence number wrong - got 10 expected 1

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 187, in __call__
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 185, in __call__
    with collapse_excgroups():
         ^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.12/contextlib.py", line 158, in __exit__
    self.gen.throw(value)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_utils.py", line 83, in collapse_excgroups
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 187, in __call__
    response = await self.dispatch_func(request, call_next)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/core/middleware.py", line 46, in session_middleware
    session.rollback()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 1931, in rollback
    self._transaction.rollback(_to_root=True)
  File "<string>", line 2, in rollback
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/state_changes.py", line 139, in _go
    ret_value = fn(self, *arg, **kw)
                ^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 1338, in rollback
    raise rollback_err[1].with_traceback(rollback_err[2])
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 1303, in rollback
    t[1].rollback()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2598, in rollback
    self._do_rollback()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2717, in _do_rollback
    self._close_impl(try_deactivate=True)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2700, in _close_impl
    self._connection_rollback_impl()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2692, in _connection_rollback_impl
    self.connection._rollback_impl()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1121, in _rollback_impl
    self._handle_dbapi_exception(e, None, None, None, None)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2343, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1119, in _rollback_impl
    self.engine.dialect.do_rollback(self.connection)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 692, in do_rollback
    dbapi_connection.rollback()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 505, in rollback
    self._read_ok_packet()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 465, in _read_ok_packet
    pkt = self._read_packet()
          ^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 764, in _read_packet
    raise err.InternalError(
sqlalchemy.exc.InternalError: (pymysql.err.InternalError) Packet sequence number wrong - got 10 expected 1
(Background on this error at: https://sqlalche.me/e/20/2j85)
[2025-11-09T19:16:20.981Z] | ERROR   | N/A      | 61393  | middleware.py:47::session_middleware() | Transaction rolled back due to error: read of closed file
INFO:     127.0.0.1:52942 - "GET /api/v1/graph/expand?node_type=table&direction=upstream&depth=1&node_db_id=28 HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
  + Exception Group Traceback (most recent call last):
  |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_utils.py", line 77, in collapse_excgroups
  |     yield
  |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 186, in __call__
  |     async with anyio.create_task_group() as task_group:
  |                ^^^^^^^^^^^^^^^^^^^^^^^^^
  |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 781, in __aexit__
  |     raise BaseExceptionGroup(
  | ExceptionGroup: unhandled errors in a TaskGroup (1 sub-exception)
  +-+---------------- 1 ----------------
    | Traceback (most recent call last):
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 401, in run_asgi
    |     result = await app(  # type: ignore[func-returns-value]
    |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 70, in __call__
    |     return await self.app(scope, receive, send)
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    |     await super().__call__(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/applications.py", line 113, in __call__
    |     await self.middleware_stack(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 187, in __call__
    |     raise exc
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 165, in __call__
    |     await self.app(scope, receive, _send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 185, in __call__
    |     with collapse_excgroups():
    |          ^^^^^^^^^^^^^^^^^^^^
    |   File "/usr/lib/python3.12/contextlib.py", line 158, in __exit__
    |     self.gen.throw(value)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_utils.py", line 83, in collapse_excgroups
    |     raise exc
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 187, in __call__
    |     response = await self.dispatch_func(request, call_next)
    |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/src/graph_manager/core/middleware.py", line 36, in session_middleware
    |     response = await call_next(request)
    |                ^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 163, in call_next
    |     raise app_exc
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 149, in coro
    |     await self.app(scope, receive_or_disconnect, send_no_error)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 62, in __call__
    |     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    |     raise exc
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    |     await app(scope, receive, sender)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 715, in __call__
    |     await self.middleware_stack(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 735, in app
    |     await route.handle(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 288, in handle
    |     await self.app(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 76, in app
    |     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    |     raise exc
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    |     await app(scope, receive, sender)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 73, in app
    |     response = await f(request)
    |                ^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 301, in app
    |     raw_response = await run_endpoint_function(
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 214, in run_endpoint_function
    |     return await run_in_threadpool(dependant.call, **values)
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/concurrency.py", line 39, in run_in_threadpool
    |     return await anyio.to_thread.run_sync(func, *args)
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/to_thread.py", line 56, in run_sync
    |     return await get_async_backend().run_sync_in_worker_thread(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 2485, in run_sync_in_worker_thread
    |     return await future
    |            ^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 976, in run
    |     result = context.run(func, *args)
    |              ^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "src/dependency_injector/_cwiring.pyx", line 28, in dependency_injector._cwiring._get_sync_patched._patched
    |   File "/home/darkwing/src/graph/graph-251031/src/graph_manager/api/v1/endpoints/expand.py", line 34, in expand
    |     return svc.get_table_neighbors_by_dbid(db_id=node_db_id, level=depth, direction=direction, limit=limit)
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/src/graph_manager/services/graph_query_service.py", line 117, in get_table_neighbors_by_dbid
    |     table = self.uow.tables.get_by_id(db_id)
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/src/graph_manager/repositories/table_repository.py", line 44, in get_by_id
    |     return self.db.execute(
    |            ^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2308, in execute
    |     return self._execute_internal(
    |            ^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2190, in _execute_internal
    |     result: Result[Any] = compile_state_cls.orm_execute_statement(
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/context.py", line 293, in orm_execute_statement
    |     result = conn.execute(
    |              ^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1416, in execute
    |     return meth(
    |            ^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/sql/elements.py", line 516, in _execute_on_connection
    |     return connection._execute_clauseelement(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1639, in _execute_clauseelement
    |     ret = self._execute_context(
    |           ^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
    |     return self._exec_single_context(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
    |     self._handle_dbapi_exception(
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2346, in _handle_dbapi_exception
    |     raise exc_info[1].with_traceback(exc_info[2])
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    |     self.dialect.do_execute(
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 922, in do_execute
    |     cursor.execute(statement, parameters)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 153, in execute
    |     result = self._query(query)
    |              ^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 322, in _query
    |     conn.query(q)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 575, in query
    |     self._affected_rows = self._read_query_result(unbuffered=unbuffered)
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 826, in _read_query_result
    |     result.read()
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1210, in read
    |     self._read_result_packet(first_packet)
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1286, in _read_result_packet
    |     self._get_descriptions()
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1371, in _get_descriptions
    |     field = self.connection._read_packet(FieldDescriptorPacket)
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 751, in _read_packet
    |     packet_header = self._read_bytes(4)
    |                     ^^^^^^^^^^^^^^^^^^^
    |   File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 789, in _read_bytes
    |     data = self._rfile.read(num_bytes)
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    | ValueError: read of closed file
    +------------------------------------

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 187, in __call__
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 185, in __call__
    with collapse_excgroups():
         ^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.12/contextlib.py", line 158, in __exit__
    self.gen.throw(value)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_utils.py", line 83, in collapse_excgroups
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 187, in __call__
    response = await self.dispatch_func(request, call_next)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/core/middleware.py", line 36, in session_middleware
    response = await call_next(request)
               ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 163, in call_next
    raise app_exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/base.py", line 149, in coro
    await self.app(scope, receive_or_disconnect, send_no_error)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 735, in app
    await route.handle(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 288, in handle
    await self.app(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 76, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/routing.py", line 73, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 301, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/fastapi/routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/starlette/concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/to_thread.py", line 56, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 2485, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 976, in run
    result = context.run(func, *args)
             ^^^^^^^^^^^^^^^^^^^^^^^^
  File "src/dependency_injector/_cwiring.pyx", line 28, in dependency_injector._cwiring._get_sync_patched._patched
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/api/v1/endpoints/expand.py", line 34, in expand
    return svc.get_table_neighbors_by_dbid(db_id=node_db_id, level=depth, direction=direction, limit=limit)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/services/graph_query_service.py", line 117, in get_table_neighbors_by_dbid
    table = self.uow.tables.get_by_id(db_id)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/src/graph_manager/repositories/table_repository.py", line 44, in get_by_id
    return self.db.execute(
           ^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2308, in execute
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/session.py", line 2190, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/orm/context.py", line 293, in orm_execute_statement
    result = conn.execute(
             ^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1416, in execute
    return meth(
           ^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/sql/elements.py", line 516, in _execute_on_connection
    return connection._execute_clauseelement(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1639, in _execute_clauseelement
    ret = self._execute_context(
          ^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
    return self._exec_single_context(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
    self._handle_dbapi_exception(
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2346, in _handle_dbapi_exception
    raise exc_info[1].with_traceback(exc_info[2])
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
    self.dialect.do_execute(
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 922, in do_execute
    cursor.execute(statement, parameters)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 153, in execute
    result = self._query(query)
             ^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/cursors.py", line 322, in _query
    conn.query(q)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 575, in query
    self._affected_rows = self._read_query_result(unbuffered=unbuffered)
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 826, in _read_query_result
    result.read()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1210, in read
    self._read_result_packet(first_packet)
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1286, in _read_result_packet
    self._get_descriptions()
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 1371, in _get_descriptions
    field = self.connection._read_packet(FieldDescriptorPacket)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 751, in _read_packet
    packet_header = self._read_bytes(4)
                    ^^^^^^^^^^^^^^^^^^^
  File "/home/darkwing/src/graph/graph-251031/.venv/lib/python3.12/site-packages/pymysql/connections.py", line 789, in _read_bytes
    data = self._rfile.read(num_bytes)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
ValueError: read of closed file