import type Database from 'better-sqlite3'

export interface Migration {
  version: number
  name: string
  sql: string
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'peluquero')),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE role_permissions (
        role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'peluquero')),
        module TEXT NOT NULL,
        allowed INTEGER NOT NULL DEFAULT 1 CHECK (allowed IN (0, 1)),
        PRIMARY KEY (role, module)
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        doc_number TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_clients_name ON clients(name);
      CREATE INDEX idx_clients_phone ON clients(phone);
      CREATE INDEX idx_clients_doc ON clients(doc_number);

      CREATE TABLE pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        species TEXT NOT NULL DEFAULT 'Perro',
        breed TEXT,
        sex TEXT NOT NULL DEFAULT 'desconocido' CHECK (sex IN ('macho', 'hembra', 'desconocido')),
        birth_date TEXT,
        color TEXT,
        weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
        sterilized INTEGER NOT NULL DEFAULT 0 CHECK (sterilized IN (0, 1)),
        allergies TEXT,
        chronic_conditions TEXT,
        notes TEXT,
        photo_path TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_pets_client ON pets(client_id);
      CREATE INDEX idx_pets_name ON pets(name);

      CREATE TABLE medical_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
        type TEXT NOT NULL CHECK (type IN ('consulta', 'vacuna', 'desparasitacion', 'cirugia', 'tratamiento', 'nota', 'peso')),
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        diagnosis TEXT,
        treatment TEXT,
        vet_name TEXT,
        weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
        next_due_date TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_medical_pet_date ON medical_records(pet_id, date);
      CREATE INDEX idx_medical_next_due ON medical_records(next_due_date);

      CREATE TABLE product_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT COLLATE NOCASE UNIQUE,
        barcode TEXT COLLATE NOCASE UNIQUE,
        category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
        unit TEXT NOT NULL DEFAULT 'unidad',
        cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
        price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
        stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0),
        min_stock REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_products_name ON products(name);
      CREATE INDEX idx_products_category ON products(category_id);

      CREATE TABLE product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_code TEXT,
        expiry_date TEXT,
        quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
        received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_batches_product ON product_batches(product_id);
      CREATE INDEX idx_batches_expiry ON product_batches(expiry_date);

      CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        batch_id INTEGER REFERENCES product_batches(id) ON DELETE SET NULL,
        type TEXT NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste', 'devolucion', 'venta', 'anulacion')),
        quantity_delta REAL NOT NULL,
        unit_cost_cents INTEGER CHECK (unit_cost_cents IS NULL OR unit_cost_cents >= 0),
        reason TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_movements_product_date ON stock_movements(product_id, created_at);
      CREATE INDEX idx_movements_reference ON stock_movements(reference_type, reference_id);

      CREATE TABLE services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        category TEXT NOT NULL DEFAULT 'peluqueria' CHECK (category IN ('peluqueria', 'consulta', 'otro')),
        price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
        duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE groomers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        color TEXT NOT NULL DEFAULT '#0ca678',
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT NOT NULL UNIQUE,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
        payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
        status TEXT NOT NULL DEFAULT 'completada' CHECK (status IN ('completada', 'anulada')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        cancelled_at TEXT,
        cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        cancel_reason TEXT
      );
      CREATE INDEX idx_sales_created ON sales(created_at);
      CREATE INDEX idx_sales_client ON sales(client_id);
      CREATE INDEX idx_sales_status ON sales(status);

      CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
        CHECK ((product_id IS NOT NULL AND service_id IS NULL) OR (product_id IS NULL AND service_id IS NOT NULL))
      );
      CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX idx_sale_items_product ON sale_items(product_id);

      CREATE TABLE sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        method TEXT NOT NULL CHECK (method IN ('efectivo', 'tarjeta', 'transferencia')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);

      CREATE TABLE sale_batch_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_item_id INTEGER NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
        batch_id INTEGER NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
        quantity REAL NOT NULL CHECK (quantity > 0)
      );
      CREATE INDEX idx_sale_allocations_item ON sale_batch_allocations(sale_item_id);
      CREATE INDEX idx_sale_allocations_batch ON sale_batch_allocations(batch_id);

      CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
        groomer_id INTEGER NOT NULL REFERENCES groomers(id) ON DELETE RESTRICT,
        date TEXT NOT NULL,
        start_minutes INTEGER NOT NULL CHECK (start_minutes >= 0 AND start_minutes < 1440),
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'en_proceso', 'completado', 'cancelado', 'no_asistio')),
        notes TEXT,
        total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
        sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_appointments_date ON appointments(date);
      CREATE INDEX idx_appointments_groomer_date ON appointments(groomer_id, date);
      CREATE INDEX idx_appointments_pet ON appointments(pet_id);

      CREATE TABLE appointment_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0)
      );
      CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);

      CREATE TABLE activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_activity_created ON activity_log(created_at);
    `
  }
]

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all()
      .map((row) => (row as { version: number }).version)
  )

  const insert = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')

  const applyMigration = db.transaction((migration: Migration) => {
    db.exec(migration.sql)
    insert.run(migration.version, migration.name)
  })

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      applyMigration(migration)
    }
  }
}
