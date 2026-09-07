

SQL（结构化查询语言）可用于对关系型数据库中的数据进行查询、操作和转换。

关系型数据库表示一组相关的（二维）表的集合。

每张表类似于Excel电子表格。表描述为一个由行和列组成的二维集合，其中 列代表属性，行代表表中实体的具体实例。



## 基础

### 查询

#### 筛选列

查询指定列，返回表的子集

```sql
SELECT column, another_column, … FROM mytable;
```

查询整个表

```sql
SELECT * FROM mytable;
```

#### 筛选数据行

使用WHERE子句，该子句会针对每一行数据，通过检查特定列的值来决定该行是否应被包含在结果中。

可以通过操作符来筛选；也可以通过 AND/OR 来组合操作符

```sql
SELECT column, another_column, …
FROM mytable
WHERE condition
    AND/OR another_condition
    AND/OR …;
```

数字操作符


|                     |                                                      |                                       |
| ------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Operator**        | **Condition**                                        | **SQL Example**                       |
| =, !=, <, <=, >, >= | Standard numerical operators                         | col_name **!=** 4                     |
| BETWEEN … AND …     | Number is within range of two values (inclusive)     | col_name **BETWEEN** 1.5 **AND** 10.5 |
| NOT BETWEEN … AND … | Number is not within range of two values (inclusive) | col_name **NOT BETWEEN** 1 **AND** 10 |
| IN (…)              | Number exists in a list                              | col_name **IN** (2, 4, 6)             |
| NOT IN (…)          | Number does not exist in a list                      | col_name **NOT IN** (1, 3, 5)         |


文本操作符


|              |                                                   |                                                                                        |
| ------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Operator** | **Condition**                                     | **Example**                                                                            |
| =            | 完全相等                                              | col_name **=** "abc"                                                                   |
| != or <>     | Case sensitive exact string inequality comparison | col_name **!=** "abcd"                                                                 |
| LIKE         | 不区分大小写的精确字符串比较                                    | col_name **LIKE** "ABC"                                                                |
| NOT LIKE     | 不区分大小写的精确字符串不等比较                                  | col_name **NOT LIKE** "ABCD"                                                           |
| %            | 在字符串的任何位置使用，用于匹配零个或多个字符（仅与 LIKE 或 NOT LIKE 搭配使用）  | col_name **LIKE** "%AT%" (matches "++AT++", "++AT++TIC", "C++AT++" or even "B++AT++S") |
| _            | 在字符串中任意位置使用，用于匹配单个字符（仅与LIKE或NOT LIKE配合使用）         | col_name **LIKE** "AN_" (matches "++AN++D", but not "++AN++")                          |
| IN (…)       | String exists in a list                           | col_name **IN** ("A", "B", "C")                                                        |
| NOT IN (…)   | String does not exist in a list                   | col_name **NOT IN** ("D", "E", "F")                                                    |


#### 排序

当指定ORDER BY子句时，每行会根据指定列的值按字母数字顺序/倒序进行排序。

```sql
SELECT column, another_column, …
FROM mytable
ORDER BY column ASC/DESC;
```

一个与 ORDER BY 子句经常一起使用的子句是 LIMIT 和 OFFSET 子句

LIMIT 会控制返回的行数，而可选的 OFFSET 将指定从何处开始计数行数。

```sql
SELECT column, another_column, …
FROM mytable
ORDER BY column ASC/DESC
LIMIT num_limit OFFSET num_offset;
```

#### 去重

```sql
-- 返回 ipAddress 列并去重
SELECT DISTINCT ipAddress FROM session;

-- 返回 userId, ipAddress 两列且两列都相同才算重复
SELECT DISTINCT userId, ipAddress FROM session;
```

注意！ `DISTINCT` 是针对所有筛选列的比较。

#### 主键和外键

**主键 = 一张表里每一行的唯一标识，不能重复，**不能是 NULL

**外键 = 本表某一列，引用另一表的主键（或唯一键），表示「这行属于 / 关联到那边的哪一行」。**

#### 判断 NULL

在 WHERE 子句中通过使用 IS NULL 或 IS NOT NULL 约束来检查某一列是否为 NULL。

```sql
SELECT column, another_column, …
FROM mytable
WHERE column IS/IS NOT NULL
```

#### JOIN

**INNER JOIN：取两张表的交集：把两张表里「能匹配上的行」拼在一起**

```sql
SELECT u.name, a.providerId, s.ipAddress
FROM session s
INNER JOIN user u ON s.userId = u.id
INNER JOIN account a ON a.userId = u.id;
```

- 多表时，建议每个表的列使用 [表名].[列名] 的形式访问（列名在多表唯一时可以直接访问，但还是推荐这样）
- 表可以起别名来方便访问
- ON 关键字表示匹配条件，通常是**外键 = 主键**

#### **LEFT、RIGHT（用的少）、FULL（SQLite 不支持） JOIN**

当将表 A 与表 B 进行连接时，LEFT JOIN 会保留表 A 中的所有行，无论是否在表 B 中找到匹配行，匹配到的就合并。RIGHT JOIN 则相反，会保留表 B 中的所有行，无论是否在表 A 中找到匹配行。最后，FULL JOIN 会保留两个表中的所有行，无论另一张表中是否存在匹配行。

#### 操作符与工具函数

- 目的：对查询结果进行格式化或过滤原始数据（用在 SELECT、 WHERE 、HAVING）
- 操作符：可以通过 +-*/ 等操作符来处理数字
- 工具函数：每个数据库都有自己支持的一组数学、字符串和日期函数，可用于查询。如 `ABS(x)`、`UPPER(name) 等`

```sql
SELECT particle_speed / 2.0 half_particle_speed
FROM physics_data
WHERE ABS(particle_position) * 10.0 > 500;
```

#### 聚合函数和分组

**聚合函数**把一列的数据进行计算合并成一个值


| **函数**     | **作用** |
| ---------- | ------ |
| `COUNT(*)` | 有多少行   |
| `SUM(col)` | 某列数值之和 |
| `AVG(col)` | 某列平均值  |
| `MIN(col)` | 最小值    |
| `MAX(col)` | 最大值    |


```sql
-- 结果只有一列 total_sales，一般都要将结果重新命名，否则列名为 SUM(sales)
SELECT SUM(sales) total_sales FROM domestic_sales;
```

分组 = **先将数据按某一列（或多列）分成若干组，然后就可以对每组分别做聚合。**

- 使用 `GROUP BY` 时，`SELECT` 里只能出现`GROUP BY` 里的列和需要使用聚合函数计算的列

```sql
SELECT movie_id, SUM(sales) total_sales
FROM domestic_sales
GROUP BY movie_id;
```

```sql
-- GROUP BY 可以写多列
GROUP BY movie_id, region;
```

分组后筛选

- 分组发生在 WHERE 之后，HAVING 关键字可以对分组后进行筛选，和 WHERE 用法相同

```sql
SELECT group_by_column, AGG_FUNC(column_expression) AS aggregate_result_alias, …
FROM mytable
WHERE condition
GROUP BY column
HAVING group_condition;
```

#### 执行顺序

```sql
SELECT DISTINCT column, AGG_FUNC(column_or_expression), …
FROM mytable
    JOIN another_table
      ON mytable.column = another_table.column
    WHERE constraint_expression
    GROUP BY column
    HAVING constraint_expression
    ORDER BY column ASC/DESC
    LIMIT count OFFSET COUNT;
```

- 从 FROM 开始按顺序执行
- `SELECT、DISTINCT 在 GROUP BY（HAVING） 和 ORDER BY 之间`

### 操作

*schema* 用于描述每个表的结构，以及表中每列可以包含的数据类型。

#### INSERT

在表中插入完整数据行，可以用值也可以用表达式

```sql
INSERT INTO boxoffice
VALUES (1, 9.9, 283742034 / 1000000);
```

当某些列具有默认值时，也可以指定列来插入对应的数据，而忽略具有默认值的列。表中 id 是自增的，所以有：

```sql
INSERT INTO boxoffice
(rating, sales_in_millions)
VALUES (9.9, 283742034 / 1000000);
```

#### UPDATE

```sql
UPDATE mytable
SET column = value_or_expr, 
    other_column = another_value_or_expr, 
    …
WHERE condition;
```

#### DELETE

```sql
DELETE FROM mytable
WHERE condition;
```
如果不写 WHERE 语句就是删除整个表的数据

#### CREATE TABLE 

```sql
CREATE TABLE IF NOT EXISTS mytable (
    column 数据类型 约束 DEFAULT default_value,
    …
);
```

每一列定义两个东西：

- **Datatype（数据类型）**：这列存什么类型的值
- **Constraints（约束）**：这列的值必须满足什么规则

常见数据类型


| **类型** | **存什么** | **例子** |
| -------- | ---------- | -------- |
| `INTEGER` | 整数 | `42`, `-1` |
| `REAL` | 浮点数 | `3.14`, `9.9` |
| `TEXT` | 字符串 | `'hello'`, `'u1'` |
| `BLOB` | 二进制数据 | 图片、文件 |
| `BOOLEAN` | 布尔值 | `true` / `false`（SQLite 中通常用 INTEGER 0/1） |
| `DATE` / `DATETIME` / `TIMESTAMP` | 日期时间 | 各数据库实现不同，SQLite 常用 INTEGER 或 TEXT 存储 |

常见约束


| **约束** | **作用** | **例子** |
| -------- | -------- | -------- |
| `PRIMARY KEY` | 唯一标识每一行，不能 NULL | `id INTEGER PRIMARY KEY` |
| `FOREIGN KEY` | 必须引用另一表已存在的行 | `FOREIGN KEY (user_id) REFERENCES user(id)` |
| `NOT NULL` | 不能为空 | `name TEXT NOT NULL` |
| `UNIQUE` | 不能重复（可以有多个 NULL） | `email TEXT UNIQUE` |
| `DEFAULT` | 没填时用默认值 | `status TEXT DEFAULT 'active'` |
| `CHECK` | 自定义条件 | `CHECK (rating >= 0 AND rating <= 10)` |
| `AUTOINCREMENT` | 整数主键自动递增（SQLite） | `id INTEGER PRIMARY KEY AUTOINCREMENT` |

完整示例

```sql
CREATE TABLE IF NOT EXISTS boxoffice (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    rating   REAL    NOT NULL CHECK (rating >= 0 AND rating <= 10),
    sales    INTEGER NOT NULL DEFAULT 0,
    region   TEXT    NOT NULL DEFAULT 'domestic',
    UNIQUE (movie_id, region),
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);
```

#### ALTER TABLE

修改已有表的结构（DDL），不改变「改数据 / 删行」的 `UPDATE` / `DELETE` 范畴。线上项目结构变更时常用，实际多由迁移工具（如 Drizzle）生成。

常见操作


| **操作** | **作用** | **示例** |
| -------- | -------- | -------- |
| `ADD COLUMN` | 添加新列 | `ALTER TABLE user ADD COLUMN bio TEXT;` |
| `DROP COLUMN` | 删除列（SQLite 3.35+） | `ALTER TABLE user DROP COLUMN bio;` |
| `RENAME COLUMN` | 重命名列（SQLite 3.25+） | `ALTER TABLE user RENAME COLUMN name TO display_name;` |
| `RENAME TO` | 重命名表 | `ALTER TABLE user RENAME TO users;` |

注意：SQLite 的 `ALTER TABLE` 能力弱于 PostgreSQL / MySQL（如改列类型常需建新表再迁移数据）。复杂变更由 Drizzle 迁移自动处理即可。

#### sub squery

假设你的公司有一份所有销售代表的名单，其中包含每位代表带来的收入数据以及他们的个人薪资。当前形势紧张，你希望找出哪些代表给公司带来的成本高于每位代表带来的平均收入。

```sql
SELECT *
FROM sales_associates
WHERE salary > 
   (SELECT AVG(revenue_generated)
    FROM sales_associates);
```