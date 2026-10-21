"""
================================================================================
 BYTECODE COMPILER + STACK-BASED VIRTUAL MACHINE
 (Design and Implementation of a Bytecode Compiler and Virtual Machine)
================================================================================

FULL PIPELINE (mirrors Practicals 1-7 of the Compiler Design course, then
goes one step further by actually EXECUTING the program instead of just
generating three-address code):

    Source Code
        |  (Practical 1-2: Lexical Analysis)
        v
    Tokens  ------------------------------->  reports LEXICAL ERRORS + line no.
        |  (Practical 4-5: Syntax Analysis, with panic-mode error recovery)
        v
    AST (Abstract Syntax Tree)
        |  (Practical 3 + 6: Symbol Table + Semantic Analysis)
        v
    Symbol Table  -------------------------->  reports SEMANTIC ERRORS
        |  (This project: Bytecode Generation -- our version of
        |   Practical 7's "intermediate code for control statements")
        v
    Bytecode (stack-machine instructions)
        |  (This project: Virtual Machine execution)
        v
    Program Output

SUPPORTED LANGUAGE:
    - Variable declaration:  let x = 5;
    - Assignment:             x = x + 1;
    - Arithmetic:             + - * /
    - Comparisons:            == != < > <= >=
    - Conditionals:           if (cond) { ... } else { ... }
    - Loops:                  while (cond) { ... }
    - Output:                 print(expr);

Design note: the language only has one type (int), so "semantic analysis"
here focuses on the two checks every compiler course asks for first --
undeclared-variable use and variable redeclaration -- rather than full type
checking. This is a deliberate scope choice, not an oversight, and is worth
saying explicitly if a faculty member asks "where's the type checking?".
================================================================================
"""

# AST looks like this - > ("binop", "+", ("num", 10), ("num", 20))

# ==============================================================================
# STAGE 1: LEXER  (Source text -> list of Tokens, with line numbers)
# ==============================================================================

KEYWORDS = {"let", "print", "if", "else", "while"}


class Token:
    def __init__(self, type_, value, line):
        self.type = type_
        self.value = value
        self.line = line

    def __repr__(self):
        return f"Token({self.type}, {self.value!r}, line={self.line})"


class LexicalError:
    def __init__(self, char, line):
        self.char = char
        self.line = line

    def __str__(self):
        return f"Lexical Error at line {self.line}: unexpected character {self.char!r}"


def lex(source):
    """Returns (tokens, errors). Keeps scanning after a bad character so it
    can report every lexical error in one pass, the same way Practical 2
    asks for errors to be reported with their line numbers."""
    tokens = []
    errors = []
    i = 0
    n = len(source)
    line = 1

    while i < n:
        ch = source[i]

        if ch == "\n":
            line += 1
            i += 1
            continue

        if ch in " \t\r":
            i += 1
            continue

        # Single-line comments: // ...
        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            while i < n and source[i] != "\n":
                i += 1
            continue

        if ch.isdigit():
            start = i
            while i < n and source[i].isdigit():
                i += 1
            tokens.append(Token("NUMBER", int(source[start:i]), line))
            continue

        if ch.isalpha() or ch == "_":
            start = i
            while i < n and (source[i].isalnum() or source[i] == "_"):
                i += 1
            word = source[start:i]
            if word in KEYWORDS:
                tokens.append(Token(word.upper(), word, line))
            else:
                tokens.append(Token("IDENT", word, line))
            continue

        two = source[i:i + 2]
        if two in ("==", "!=", "<=", ">="):
            tokens.append(Token("OP", two, line))
            i += 2
            continue

        if ch in "+-*/=<>(){};":
            tokens.append(Token(ch, ch, line))
            i += 1
            continue

        # Unrecognized character: record error, skip it, keep going
        errors.append(LexicalError(ch, line))
        i += 1

    tokens.append(Token("EOF", None, line))
    return tokens, errors


# ==============================================================================
# STAGE 2: PARSER  (Tokens -> AST), with panic-mode error recovery
# ==============================================================================
# Recursive-descent parser. AST nodes are plain tuples; statement nodes carry
# a trailing line number so later stages can report errors precisely.
#
# Grammar (EBNF):
#   program    := statement*
#   statement  := "let" IDENT "=" expr ";"
#               | IDENT "=" expr ";"
#               | "print" "(" expr ")" ";"
#               | "if" "(" expr ")" block ("else" block)?
#               | "while" "(" expr ")" block
#   block      := "{" statement* "}"
#   expr       := comparison
#   comparison := term (("=="|"!="|"<"|">"|"<="|">=") term)*
#   term       := factor (("+"|"-") factor)*
#   factor     := unary (("*"|"/") unary)*
#   unary      := NUMBER | IDENT | "(" expr ")" | "-" unary

class ParseError(Exception):
    pass


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0
        self.errors = []   # collected via panic-mode recovery

    def peek(self):
        return self.tokens[self.pos]

    def advance(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, type_):
        tok = self.peek()
        if tok.type != type_:
            raise ParseError(f"Syntax Error at line {tok.line}: expected '{type_}' but got '{tok.value}'")
        return self.advance()

    # ---- top level, with panic-mode recovery ----
    def parse_program(self):
        statements = []
        while self.peek().type != "EOF":
            try:
                statements.append(self.parse_statement())
            except ParseError as e:
                self.errors.append(str(e))
                self.synchronize()   # skip to a safe restart point and keep going
        return ("program", statements)

    def synchronize(self):
        """Panic-mode recovery: discard tokens until a likely statement
        boundary (';' or '}') so one syntax error doesn't hide the rest."""
        while self.peek().type not in (";", "}", "EOF"):
            self.advance()
        if self.peek().type == ";":
            self.advance()

    def parse_block(self):
        self.expect("{")
        statements = []
        while self.peek().type not in ("}", "EOF"):
            try:
                statements.append(self.parse_statement())
            except ParseError as e:
                self.errors.append(str(e))
                self.synchronize()
        self.expect("}")
        return statements

    def parse_statement(self):
        tok = self.peek()

        if tok.type == "LET":
            self.advance()
            name = self.expect("IDENT").value
            self.expect("=")
            expr = self.parse_expr()
            self.expect(";")
            return ("let", name, expr, tok.line)

        if tok.type == "PRINT":
            self.advance()
            self.expect("(")
            expr = self.parse_expr()
            self.expect(")")
            self.expect(";")
            return ("print", expr, tok.line)

        if tok.type == "IF":
            self.advance()
            self.expect("(")
            cond = self.parse_expr()
            self.expect(")")
            then_block = self.parse_block()
            else_block = []
            if self.peek().type == "ELSE":
                self.advance()
                else_block = self.parse_block()
            return ("if", cond, then_block, else_block, tok.line)

        if tok.type == "WHILE":
            self.advance()
            self.expect("(")
            cond = self.parse_expr()
            self.expect(")")
            body = self.parse_block()
            return ("while", cond, body, tok.line)

        if tok.type == "IDENT":
            name = self.advance().value
            self.expect("=")
            expr = self.parse_expr()
            self.expect(";")
            return ("assign", name, expr, tok.line)

        raise ParseError(f"Syntax Error at line {tok.line}: unexpected token '{tok.value}'")

    # ---- expressions (precedence climbing) ----
    def parse_expr(self):
        return self.parse_comparison()

    def parse_comparison(self):
        node = self.parse_term()
        while self.peek().type == "OP" and self.peek().value in ("==", "!=", "<=", ">="):
            op = self.advance().value
            right = self.parse_term()
            node = ("binop", op, node, right)
        while self.peek().type in ("<", ">"):
            op = self.advance().type
            right = self.parse_term()
            node = ("binop", op, node, right)
        return node

    def parse_term(self):
        node = self.parse_factor()
        while self.peek().type in ("+", "-"):
            op = self.advance().type
            right = self.parse_factor()
            node = ("binop", op, node, right)
        return node

    def parse_factor(self):
        node = self.parse_unary()
        while self.peek().type in ("*", "/"):
            op = self.advance().type
            right = self.parse_unary()
            node = ("binop", op, node, right)
        return node

    def parse_unary(self):
        tok = self.peek()

        if tok.type == "-":
            self.advance()
            node = self.parse_unary()
            return ("binop", "-", ("num", 0), node)

        if tok.type == "NUMBER":
            self.advance()
            return ("num", tok.value)

        if tok.type == "IDENT":
            self.advance()
            return ("var", tok.value, tok.line)

        if tok.type == "(":
            self.advance()
            node = self.parse_expr()
            self.expect(")")
            return node

        raise ParseError(f"Syntax Error at line {tok.line}: unexpected token '{tok.value}' in expression")


# ==============================================================================
# STAGE 3: SYMBOL TABLE + SEMANTIC ANALYZER
# ==============================================================================
# Symbol table entry: name -> {type, address}. Address is just the order of
# declaration (0, 1, 2, ...) -- analogous to a stack/memory slot in a real
# compiler's symbol table.
#
# Two semantic checks (the same two every compiler course introduces first):
#   1. Redeclaration : "let x" when x is already declared
#   2. Undeclared use : reading/assigning a variable that was never declared

class SymbolTable:
    def __init__(self):
        self.table = {}   # name -> {"type": str, "address": int}

    def declare(self, name):
        address = len(self.table)
        self.table[name] = {"type": "int", "address": address}

    def is_declared(self, name):
        return name in self.table

    def print_table(self):
        print(f"{'Name':<12}{'Type':<8}{'Address'}")
        print("-" * 28)
        for name, info in self.table.items():
            print(f"{name:<12}{info['type']:<8}{info['address']}")


class SemanticAnalyzer:
    def __init__(self):
        self.symtab = SymbolTable()
        self.errors = []

    def analyze(self, ast):
        _, statements = ast
        for stmt in statements:
            self.check_statement(stmt)
        return self.symtab, self.errors

    def check_statement(self, stmt):
        kind = stmt[0]

        if kind == "let":
            _, name, expr, line = stmt
            self.check_expr(expr)
            if self.symtab.is_declared(name):
                self.errors.append(f"Semantic Error at line {line}: redeclaration of variable '{name}'")
            else:
                self.symtab.declare(name)

        elif kind == "assign":
            _, name, expr, line = stmt
            self.check_expr(expr)
            if not self.symtab.is_declared(name):
                self.errors.append(f"Semantic Error at line {line}: assignment to undeclared variable '{name}'")

        elif kind == "print":
            _, expr, line = stmt
            self.check_expr(expr)

        elif kind == "if":
            _, cond, then_block, else_block, line = stmt
            self.check_expr(cond)
            for s in then_block:
                self.check_statement(s)
            for s in else_block:
                self.check_statement(s)

        elif kind == "while":
            _, cond, body, line = stmt
            self.check_expr(cond)
            for s in body:
                self.check_statement(s)

    def check_expr(self, expr):
        kind = expr[0]
        if kind == "var":
            _, name, line = expr
            if not self.symtab.is_declared(name):
                self.errors.append(f"Semantic Error at line {line}: use of undeclared variable '{name}'")
        elif kind == "binop":
            _, op, left, right = expr
            self.check_expr(left)
            self.check_expr(right)
        # "num" nodes need no check


# ==============================================================================
# STAGE 4: BYTECODE COMPILER  (AST -> list of bytecode instructions)
# ==============================================================================
# Instruction set:
#   PUSH <value>          push a constant onto the stack
#   LOAD <name>           push value of variable <name>
#   STORE <name>          pop value, store into variable <name>
#   BINOP <op>            pop b, pop a, push (a <op> b)
#   PRINT                 pop value, print it
#   JMP <addr>            jump to instruction index <addr>
#   JMP_IF_FALSE <addr>   pop value, if false jump to <addr>
#   HALT                  stop execution
#
# Jump targets are unknown until later code is generated, so we use
# backpatching: emit a placeholder, remember its index, fix it up later.

class Compiler:
    def __init__(self):
        self.code = []

    def emit(self, opcode, operand=None):
        self.code.append([opcode, operand])
        return len(self.code) - 1

    def compile_program(self, ast):
        _, statements = ast
        for stmt in statements:
            self.compile_statement(stmt)
        self.emit("HALT")
        return self.code

    def compile_statement(self, stmt):
        kind = stmt[0]

        if kind == "let":
            _, name, expr, _line = stmt
            self.compile_expr(expr)
            self.emit("STORE", name)

        elif kind == "assign":
            _, name, expr, _line = stmt
            self.compile_expr(expr)
            self.emit("STORE", name)

        elif kind == "print":
            _, expr, _line = stmt
            self.compile_expr(expr)
            self.emit("PRINT")

        elif kind == "if":
            _, cond, then_block, else_block, _line = stmt
            self.compile_expr(cond)
            jmp_false_idx = self.emit("JMP_IF_FALSE", None)

            for s in then_block:
                self.compile_statement(s)

            if else_block:
                jmp_end_idx = self.emit("JMP", None)
                self.code[jmp_false_idx][1] = len(self.code)
                for s in else_block:
                    self.compile_statement(s)
                self.code[jmp_end_idx][1] = len(self.code)
            else:
                self.code[jmp_false_idx][1] = len(self.code)

        elif kind == "while":
            _, cond, body, _line = stmt
            loop_start = len(self.code)
            self.compile_expr(cond)
            jmp_false_idx = self.emit("JMP_IF_FALSE", None)

            for s in body:
                self.compile_statement(s)
            self.emit("JMP", loop_start)

            self.code[jmp_false_idx][1] = len(self.code)

        else:
            raise ValueError(f"Unknown statement kind: {kind}")

    def compile_expr(self, expr):
        kind = expr[0]

        if kind == "num":
            self.emit("PUSH", expr[1])

        elif kind == "var":
            self.emit("LOAD", expr[1])

        elif kind == "binop":
            _, op, left, right = expr
            self.compile_expr(left)
            self.compile_expr(right)
            self.emit("BINOP", op)

        else:
            raise ValueError(f"Unknown expression kind: {kind}")


# ==============================================================================
# STAGE 5: VIRTUAL MACHINE  (executes the bytecode)
# ==============================================================================

class VM:
    def __init__(self, code):
        self.code = code
        self.stack = []
        self.variables = {}
        self.pc = 0

    def run(self):
        while True:
            opcode, operand = self.code[self.pc]

            if opcode == "PUSH":
                self.stack.append(operand)
                self.pc += 1

            elif opcode == "LOAD":
                self.stack.append(self.variables.get(operand, 0))
                self.pc += 1

            elif opcode == "STORE":
                self.variables[operand] = self.stack.pop()
                self.pc += 1

            elif opcode == "BINOP":
                b = self.stack.pop()
                a = self.stack.pop()
                self.stack.append(self.apply_op(operand, a, b))
                self.pc += 1

            elif opcode == "PRINT":
                print(self.stack.pop())
                self.pc += 1

            elif opcode == "JMP":
                self.pc = operand

            elif opcode == "JMP_IF_FALSE":
                cond = self.stack.pop()
                self.pc = operand if not cond else self.pc + 1

            elif opcode == "HALT":
                break

            else:
                raise RuntimeError(f"Unknown opcode: {opcode}")

    @staticmethod
    def apply_op(op, a, b):
        if op == "+":  return a + b
        if op == "-":  return a - b
        if op == "*":  return a * b
        if op == "/":  return a // b
        if op == "==": return int(a == b)
        if op == "!=": return int(a != b)
        if op == "<":  return int(a < b)
        if op == ">":  return int(a > b)
        if op == "<=": return int(a <= b)
        if op == ">=": return int(a >= b)
        raise RuntimeError(f"Unknown operator: {op}")


# ==============================================================================
# DRIVER: runs all five stages in order, stopping if a stage reports errors
# ==============================================================================

def run_source(source, label="Program"):
    print(f"\n{'=' * 60}\n RUNNING: {label}\n{'=' * 60}")

    # Stage 1: Lexical Analysis
    tokens, lex_errors = lex(source)
    if lex_errors:
        print("\n--- LEXICAL ERRORS ---")
        for e in lex_errors:
            print(e)
        return

    # Stage 2: Syntax Analysis
    parser = Parser(tokens)
    ast = parser.parse_program()
    if parser.errors:
        print("\n--- SYNTAX ERRORS ---")
        for e in parser.errors:
            print(e)
        return

    # Stage 3: Symbol Table + Semantic Analysis
    analyzer = SemanticAnalyzer()
    symtab, sem_errors = analyzer.analyze(ast)
    if sem_errors:
        print("\n--- SEMANTIC ERRORS ---")
        for e in sem_errors:
            print(e)
        return

    print("\n--- SYMBOL TABLE ---")
    symtab.print_table()

    # Stage 4: Bytecode Generation
    code = Compiler().compile_program(ast)
    print("\n--- BYTECODE ---")
    for i, instr in enumerate(code):
        print(f"{i:3}: {instr[0]:15} {instr[1] if instr[1] is not None else ''}")

    # Stage 5: Execution
    print("\n--- OUTPUT ---")
    VM(code).run()


# ==============================================================================
# DEMO PROGRAMS
# ==============================================================================

VALID_PROGRAM = """
let sum = 0;
let i = 1;

while (i <= 5) {
    sum = sum + i;
    i = i + 1;
}

print(sum);

if (sum > 10) {
    print(1);
} else {
    print(0);
}
"""

# Deliberately broken program -- shows the lexer/parser/semantic-analyzer
# catching real mistakes with line numbers, which is worth demoing live.
PROGRAM_WITH_ERRORS = """
let x = 5;
let x = 10;
y = 20;
print(z);
"""


# ============================================================
# CUSTOM TEST SUITE FOR PCD BYTECODE COMPILER + VIRTUAL MACHINE
# ============================================================

TEST_PROGRAMS = [
    (
        "TEST 1 - Variables and Arithmetic",
        """
        let a = 10;
        let b = a;
        let result = a + b * 2;
        print(result);
        """
    ),

    (
        "TEST 2 - While Loop",
        """
        let sum = 0;
        let i = 1;

        while (i <= 5) {
            sum = sum + i;
            i = i + 1;
        }

        print(sum);
        """
    ),

    (
        "TEST 3 - If-Else Condition",
        """
        let x = 15;

        if (x > 10) {
            print(1);
        } else {
            print(0);
        }
        """
    ),

    (
        "TEST 4 - Nested Arithmetic",
        """
        let result = (10 + 5) * 2 - 4;
        print(result);
        """
    ),

    (
        "TEST 5 - Undeclared Variable",
        """
        let x = 10;
        print(y);
        """
    ),

    (
        "TEST 6 - Variable Redeclaration",
        """
        let x = 10;
        let x = 20;
        print(x);
        """
    ),
    
    (
        "TEST 7 - False Condition",
        """
        let x = 5;

        if (x > 10) {
            print(100);
        } else {
            print(200);
        }
        """
    ),
    
    (
        "TEST 8 - Syntax Error Recovery",
        """
        let a = 10;
        let b = ;
        let c = 30;
        print(c);
        """
    ),

    (
        "TEST 9 - Nested Loops and Conditions",
        """
        let i = 1;
        let total = 0;

        while (i <= 3) {
            let j = 1;

            while (j <= 2) {
                if (i > 1) {
                    total = total + 1;
                } else {
                    total = total + 2;
                }

                j = j + 1;
            }

            i = i + 1;
        }

        print(total);
        """
    ),

    (
        "TEST 10 - Variable Scope Limitation",
        """
        if (5 < 2) {
            let hidden = 7;
        }

        print(hidden);
        """
    ),

    (
        "TEST 11 - Division by Zero",
        """
        let a = 10;
        let b = 0;
        print(a / b);
        """
    ),

    (
        "TEST 12 - Arithmetic and Comparison Operators",
        """
        print(10 - 3);
        print(20 / 4);
        print(5 == 5);
        print(5 != 3);
        print(2 < 3);
        print(4 > 8);
        print(3 <= 3);
        print(4 >= 5);
        """
    ),

]



if __name__ == "__main__":
    for test_name, test_source in TEST_PROGRAMS:
        try:
            run_source(test_source, label=test_name)
        except Exception as e:
            print("\n--- RUNTIME ERROR ---")
            print(f"{type(e).__name__}: {e}")
