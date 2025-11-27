import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchCreateStudents, type BatchStudent } from '../../services/users';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { toast } from 'react-toastify';
import { Plus, Trash2, Save, ArrowLeft, Eye, EyeOff, Upload, Info } from 'lucide-react';

type Row = {
  key: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: 'alumno' | 'supervisor';
  errors?: { name?: string; lastName?: string; email?: string; password?: string };
};

type AdminForm = {
  name: string;
  lastName: string;
  email: string;
  password: string;
  submitting: boolean;
  errors: Partial<Record<RowField, string>>;
};

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type RowField = 'name' | 'lastName' | 'email' | 'password';

const TEMPLATE_FIELDS: Array<{ key: RowField; label: string; aliases: string[] }> = [
  { key: 'name', label: 'Nombre', aliases: ['Nombre', 'Nombres', 'Name'] },
  { key: 'lastName', label: 'Apellidos', aliases: ['Apellidos', 'Apellido', 'Apellidos completos', 'Surname'] },
  { key: 'email', label: 'Email', aliases: ['Email', 'Correo', 'Correo electrónico', 'Mail'] },
  { key: 'password', label: 'Contraseña', aliases: ['Contraseña', 'Contrasena', 'Password'] },
];

const fieldLabels: Record<RowField, string> = TEMPLATE_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field.key]: field.label }),
  {} as Record<RowField, string>,
);

const allowedExtensions = new Set(['xlsx', 'xls', 'csv']);

type RawRecord = {
  values: Record<string, string>;
  rowNumber: number;
};

const emptyRow = (role: Row['role'] = 'alumno'): Row => ({
  key: crypto.randomUUID(),
  name: '',
  lastName: '',
  email: '',
  password: '',
  role,
});

const emptyAdminForm: AdminForm = {
  name: '',
  lastName: '',
  email: '',
  password: '',
  submitting: false,
  errors: {},
};

const isDraftEmpty = (draft: Pick<Row, RowField>) =>
  !draft.name && !draft.lastName && !draft.email && !draft.password;

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const headerAliasMap = (() => {
  const map = new Map<string, RowField>();
  TEMPLATE_FIELDS.forEach(field => {
    field.aliases.forEach(alias => {
      map.set(normalizeHeader(alias), field.key);
    });
  });
  return map;
})();

const extractDraftFromRecord = (record: Record<string, string>): Pick<Row, RowField> => {
  const draft: Pick<Row, RowField> = { name: '', lastName: '', email: '', password: '' };
  Object.entries(record).forEach(([key, value]) => {
    const normalized = normalizeHeader(key);
    const field = headerAliasMap.get(normalized);
    if (field) {
      draft[field] = String(value ?? '').trim();
    }
  });
  return draft;
};

const detectMissingColumns = (records: RawRecord[]) => {
  const seenColumns = new Set<string>();
  records.forEach(record => {
    Object.keys(record.values).forEach(column => {
      const normalized = normalizeHeader(column);
      if (normalized) seenColumns.add(normalized);
    });
  });

  const missing = TEMPLATE_FIELDS.filter(field =>
    field.aliases.every(alias => !seenColumns.has(normalizeHeader(alias))),
  );

  if (missing.length) {
    throw new Error(
      `Formato incorrecto. Añade las columnas obligatorias: ${missing.map(field => field.label).join(', ')}`,
    );
  }
};

const normalizeRecords = (records: RawRecord[]): Array<Pick<Row, RowField>> => {
  if (!records.length) {
    throw new Error('El archivo no contiene datos debajo de la cabecera.');
  }

  detectMissingColumns(records);

  const issues: string[] = [];
  const seenEmails = new Set<string>();
  const result: Array<Pick<Row, RowField>> = [];

  records.forEach((record, index) => {
    const rowNumber = record.rowNumber || index + 2;
    const draft = extractDraftFromRecord(record.values);

    if (isDraftEmpty(draft)) {
      return;
    }

    const missingFields: string[] = [];
    (Object.keys(fieldLabels) as RowField[]).forEach(field => {
      if (!draft[field]) missingFields.push(fieldLabels[field]);
    });

    if (missingFields.length) {
      issues.push(`Fila ${rowNumber}: ${missingFields.join(', ')} es obligatorio.`);
      return;
    }

    if (!emailRx.test(draft.email)) {
      issues.push(`Fila ${rowNumber}: email inválido (${draft.email}).`);
      return;
    }

    const normalizedEmail = draft.email.trim().toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      issues.push(`Fila ${rowNumber}: email duplicado (${draft.email}).`);
      return;
    }

    seenEmails.add(normalizedEmail);

    if (draft.password.length < MIN_PASSWORD_LENGTH) {
      issues.push(`Fila ${rowNumber}: contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    result.push(draft);
  });

  if (!result.length) {
    throw new Error(issues.length ? issues[0] : 'No se encontraron filas válidas en el archivo.');
  }

  if (issues.length) {
    const summary = issues.length > 4 ? `${issues.slice(0, 4).join(' ')}…` : issues.join(' ');
    throw new Error(summary);
  }

  return result;
};

const detectDelimiter = (line: string) => {
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const tabCount = (line.match(/\t/g) ?? []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) return ';';
  if (tabCount > commaCount && tabCount >= semicolonCount) return '\t';
  return ',';
};

const splitCsv = (text: string, delimiter: string) => {
  const rows: string[][] = [];
  let current = '';
  let insideQuotes = false;
  let row: string[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes && char === delimiter) {
      row.push(current);
      current = '';
    } else if (!insideQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }

    i += 1;
  }

  row.push(current);
  rows.push(row);
  return rows.filter(r => !(r.length === 1 && !r[0].trim()));
};

const parseCsvRecords = (text: string): RawRecord[] => {
  const sanitized = text.replace(/^\ufeff/, '');
  const trimmed = sanitized.trim();
  if (!trimmed) {
    throw new Error('El archivo está vacío.');
  }

  const firstLine = trimmed.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows = splitCsv(sanitized, delimiter);

  if (!rows.length) {
    throw new Error('No se pudo detectar la cabecera del archivo.');
  }

  const header = rows[0].map(cell => cell.trim());
  if (!header.some(Boolean)) {
    throw new Error('La primera fila debe contener los nombres de las columnas.');
  }

  const dataRows = rows.slice(1);
  const records: RawRecord[] = [];

  dataRows.forEach((cells, idx) => {
    const record: Record<string, string> = {};
    header.forEach((column, colIdx) => {
      if (!column) return;
      record[column] = (cells[colIdx] ?? '').trim();
    });

    if (Object.values(record).every(value => !value)) {
      return;
    }

    records.push({ values: record, rowNumber: idx + 2 });
  });

  if (!records.length) {
    throw new Error('No se encontraron filas con datos en el CSV.');
  }

  return records;
};

const readSpreadsheetFile = async (file: File): Promise<Array<Pick<Row, RowField>>> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.has(extension)) {
    throw new Error('Formato no soportado. Usa archivos .xlsx, .xls o .csv.');
  }

  if (extension === 'csv') {
    const text = await file.text();
    const records = parseCsvRecords(text);
    return normalizeRecords(records);
  }

  if (!window.XLSX) {
    throw new Error('No se pudo cargar el lector de Excel. Refresca la página o prueba con un CSV.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: false });
  const [sheetName] = workbook.SheetNames;

  if (!sheetName) {
    throw new Error('El archivo no contiene hojas.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' }) as Array<Record<string, string>>;

  if (!rows.length) {
    throw new Error('La hoja está vacía.');
  }

  const records: RawRecord[] = rows.map((row, index) => {
    const cloned: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === '__rowNum__') return;
      cloned[key] = typeof value === 'string' ? value : String(value ?? '');
    });

    const rowNum = typeof (row as any).__rowNum__ === 'number' ? (row as any).__rowNum__ + 1 : index + 2;

    return { values: cloned, rowNumber: rowNum };
  });

  return normalizeRecords(records);
};

const SupervisorBulkStudents: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState<AdminForm>(emptyAdminForm);

  const addRow = () => {
    setRows(prev => [...prev, emptyRow()]);
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
    setVisiblePasswords(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openAdminModal = () => {
    setAdminForm(emptyAdminForm);
    setShowAdminModal(true);
  };

  const closeAdminModal = () => {
    setAdminForm(emptyAdminForm);
    setShowAdminModal(false);
  };

  const updateAdminField = (field: RowField, value: string) => {
    setAdminForm(prev => ({ ...prev, [field]: value, errors: { ...prev.errors, [field]: undefined } }));
  };

  const updateCell = (key: string, field: keyof Row, value: string) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const toggleRole = (key: string) => {
    setRows(prev =>
      prev.map(r =>
        r.key === key ? { ...r, role: r.role === 'supervisor' ? 'alumno' : 'supervisor' } : r,
      ),
    );
  };

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validateAdminForm = (draft: AdminForm) => {
    const errors: Partial<Record<RowField, string>> = {};
    if (!draft.name.trim()) errors.name = 'El nombre es obligatorio.';
    if (!draft.lastName.trim()) errors.lastName = 'Los apellidos son obligatorios.';
    if (!draft.email.trim() || !emailRx.test(draft.email)) errors.email = 'Email inválido.';
    if (draft.password.length < MIN_PASSWORD_LENGTH)
      errors.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    return errors;
  };

  const validate = (draft: Row[]) => {
    const emails = draft.map(r => r.email.trim().toLowerCase()).filter(Boolean);
    const dupes = new Set(emails.filter((e, i) => emails.indexOf(e) !== i));

    return draft.map(r => {
      const errs: Row['errors'] = {};

      const trimmedName = r.name.trim();
      const trimmedLastName = r.lastName.trim();
      const trimmedEmail = r.email.trim();

      if (!trimmedName) errs.name = 'Nombre obligatorio';
      if (!trimmedLastName) errs.lastName = 'Apellidos obligatorios';
      if (!trimmedEmail) {
        errs.email = 'Email obligatorio';
      } else if (!emailRx.test(trimmedEmail)) {
        errs.email = 'Email inválido';
      } else if (dupes.has(trimmedEmail.toLowerCase())) {
        errs.email = 'Email duplicado';
      }

      if (!r.password) {
        errs.password = 'Contraseña obligatoria';
      } else if (r.password.length < MIN_PASSWORD_LENGTH) {
        errs.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
      }

      return { ...r, errors: errs };
    });
  };

  const validatedRows = useMemo(() => validate(rows), [rows]);
  const hasErrors = validatedRows.some(r => r.errors && Object.keys(r.errors).length > 0);
  const allEmpty = rows.every(r => isDraftEmpty(r));

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const imported = await readSpreadsheetFile(file);
      setRows(prev => {
        const preserved = prev.filter(row => !isDraftEmpty(row));
        const mapped = imported.map(data => ({ key: crypto.randomUUID(), role: 'alumno' as const, ...data }));
        const next = [...preserved, ...mapped];
        return next.length ? next : [emptyRow()];
      });
      setVisiblePasswords({});
      const message = `Se importaron ${imported.length} fila(s) desde ${file.name}.`;
      setImportMessage(message);
      toast.success(message);
    } catch (error: any) {
      const message = error?.message || 'No se pudo leer el archivo proporcionado.';
      setImportError(message);
      toast.error(message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const checked = validate(rows);
    setRows(checked);

    const allEmptyChecked = checked.every(r => isDraftEmpty(r));
    const hasErrorsChecked = checked.some(r => r.errors && Object.keys(r.errors).length > 0);

    if (allEmptyChecked) {
      toast.info('Añade al menos un usuario (alumno o admin).');
      return;
    }
    if (hasErrorsChecked) {
      toast.error('Revisa los errores antes de guardar.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: BatchStudent[] = checked
        .filter(r => !isDraftEmpty(r))
        .map(r => ({
          name: r.name.trim(),
          lastName: r.lastName.trim(),
          email: r.email.trim(),
          password: r.password,
          role: r.role,
        }));

      const result = await batchCreateStudents(payload);
      const creados = result.created.length;
      const yaExisten = result.skipped.exists?.length || 0;
      const duplicados = result.skipped.payloadDuplicates?.length || 0;

      if (creados > 0) toast.success(`Registrados ${creados} usuario(s) correctamente.`);
      if (yaExisten > 0) toast.warn(`Omitidos por existir previamente: ${result.skipped.exists.join(', ')}`);
      if (duplicados > 0)
        toast.warn(`Omitidos por duplicados en el lote: ${result.skipped.payloadDuplicates.join(', ')}`);

      setRows([emptyRow()]);
      setVisiblePasswords({});
      setImportMessage(null);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo completar el alta masiva');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateAdminForm(adminForm);
    if (Object.keys(errors).length) {
      setAdminForm(prev => ({ ...prev, errors }));
      return;
    }

    setAdminForm(prev => ({ ...prev, submitting: true }));
    try {
      await batchCreateStudents([
        {
          name: adminForm.name.trim(),
          lastName: adminForm.lastName.trim(),
          email: adminForm.email.trim(),
          password: adminForm.password,
          role: 'supervisor',
        },
      ]);
      toast.success('Admin registrado correctamente.');
      closeAdminModal();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar el admin.');
      setAdminForm(prev => ({ ...prev, submitting: false }));
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-700">Nuevo administrador</p>
                  <h2 className="text-xl font-semibold text-gray-900">Registrar admin</h2>
                  <p className="text-sm text-gray-600">
                    Completa los datos para crear una cuenta con permisos de administrador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAdminModal}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <Trash2 size={18} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="adminName"
                      className="mb-1 block text-xs text-gray-600"
                    >
                      Nombre *
                    </label>
                    <input
                      id="adminName"
                      value={adminForm.name}
                      onChange={e => updateAdminField('name', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        adminForm.errors.name ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Nombre"
                    />
                    {adminForm.errors.name && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="adminLastName"
                      className="mb-1 block text-xs text-gray-600"
                    >
                      Apellidos *
                    </label>
                    <input
                      id="adminLastName"
                      value={adminForm.lastName}
                      onChange={e => updateAdminField('lastName', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        adminForm.errors.lastName ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Apellidos"
                    />
                    {adminForm.errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="adminEmail"
                      className="mb-1 block text-xs text-gray-600"
                    >
                      Email *
                    </label>
                    <input
                      id="adminEmail"
                      value={adminForm.email}
                      onChange={e => updateAdminField('email', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        adminForm.errors.email ? 'border-red-400' : 'border-gray-300'
                      }`}
                      type="email"
                      placeholder="admin@ejemplo.com"
                    />
                    {adminForm.errors.email && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="adminPassword"
                      className="mb-1 block text-xs text-gray-600"
                    >
                      Contraseña *
                    </label>
                    <input
                      id="adminPassword"
                      value={adminForm.password}
                      onChange={e => updateAdminField('password', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                        adminForm.errors.password ? 'border-red-400' : 'border-gray-300'
                      }`}
                      type="password"
                      placeholder="Contraseña"
                    />
                    {adminForm.errors.password && (
                      <p className="mt-1 text-xs text-red-600">{adminForm.errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAdminModal}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={adminForm.submitting}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white ${
                      adminForm.submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {adminForm.submitting ? 'Registrando…' : 'Registrar admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header con Arrow Left */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/supervisor/dashboard')}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Alta masiva de alumnos y administradores</h1>
              <p className="text-gray-600">
                Rellena los campos solicitados. Puedes añadir varias filas y guardar todas de una vez. Usa el conmutador
                para marcar a un usuario como admin cuando lo necesites.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white/90 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-800">
                <Upload size={18} />
                <h2 className="text-lg font-semibold">Importar desde Excel</h2>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Crea un archivo con las columnas <strong>Nombre</strong>, <strong>Apellidos</strong>,{' '}
                <strong>Email</strong> y <strong>Contraseña</strong>. Puedes usar .xlsx, .xls o .csv exportado desde Excel.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                <li>Una fila por alumno.</li>
                <li>Contraseñas con mínimo {MIN_PASSWORD_LENGTH} caracteres.</li>
                <li>El email debe ser único dentro del archivo.</li>
              </ul>
            </div>
            <div className="w-full max-w-xs space-y-2 sm:text-right">
              <label
                className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-md transition ${
                  importing ? 'bg-indigo-400 opacity-80 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                <Upload size={16} />
                {importing ? 'Leyendo archivo…' : 'Cargar Excel/CSV'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
              {importError && <p className="text-xs text-rose-600">{importError}</p>}
              {!importError && importMessage && <p className="text-xs text-emerald-600">{importMessage}</p>}
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Info size={14} className="shrink-0" />
                <p>
                  Comprueba que la primera fila contiene los encabezados exactos de la plantilla. Las filas vacías se ignoran
                  automáticamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Cabecera SOLO desktop */}
            <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
              <div className="col-span-3">Nombre *</div>
              <div className="col-span-3">Apellidos *</div>
              <div className="col-span-3">Email *</div>
              <div className="col-span-2">Contraseña *</div>
              <div className="col-span-1 text-right">Acciones</div>
            </div>

            <div className="divide-y">
              {validatedRows.map(r => {
                const passwordVisible = !!visiblePasswords[r.key];
                const nameMobileId = `name-${r.key}`;
                const lastNameMobileId = `lastName-${r.key}`;
                const emailMobileId = `email-${r.key}`;
                const passwordMobileId = `password-${r.key}`;
                return (
                  <div key={r.key} className="px-4 py-4">
                    {/* Fila desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-3">
                        <input
                          value={r.name}
                          onChange={e => updateCell(r.key, 'name', e.target.value)}
                          placeholder="Nombre"
                          className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.name ? 'border-red-400' : 'border-gray-300'
                          }`}
                          required
                        />
                        {r.errors?.name && <p className="mt-1 text-xs text-red-600">{r.errors.name}</p>}
                      </div>

                      <div className="col-span-3">
                        <input
                          value={r.lastName}
                          onChange={e => updateCell(r.key, 'lastName', e.target.value)}
                          placeholder="Apellidos"
                          className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.lastName ? 'border-red-400' : 'border-gray-300'
                          }`}
                          required
                        />
                        {r.errors?.lastName && <p className="mt-1 text-xs text-red-600">{r.errors.lastName}</p>}
                      </div>

                      <div className="col-span-3">
                        <input
                          value={r.email}
                          onChange={e => updateCell(r.key, 'email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.email ? 'border-red-400' : 'border-gray-300'
                          }`}
                          type="email"
                          required
                        />
                        {r.errors?.email && <p className="mt-1 text-xs text-red-600">{r.errors.email}</p>}
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <input
                            value={r.password}
                            onChange={e => updateCell(r.key, 'password', e.target.value)}
                            placeholder="Contraseña"
                            className="w-full rounded-lg border border-gray-300 px-3 pr-11 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            type={passwordVisible ? 'text' : 'password'}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(r.key)}
                            className="absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-gray-500 hover:text-gray-700"
                            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {r.errors?.password && (
                          <p className="mt-1 text-xs text-red-600">{r.errors.password}</p>
                        )}
                      </div>

                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRole(r.key)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                            r.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.role === 'supervisor' ? 'Admin' : 'Alumno'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                          title="Eliminar fila"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Tarjeta móvil */}
                    <div className="md:hidden rounded-xl   bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span>{r.role === 'supervisor' ? 'Administrador' : 'Alumno'}</span>
                          <button
                            type="button"
                            onClick={() => toggleRole(r.key)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              r.role === 'supervisor'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.role === 'supervisor' ? 'Admin' : 'Alumno'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
                          title="Eliminar fila"
                          aria-label="Eliminar fila"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label
                            htmlFor={nameMobileId}
                            className="mb-1 block text-xs text-gray-600"
                          >
                            Nombre *
                          </label>
                          <input
                            id={nameMobileId}
                            value={r.name}
                            onChange={e => updateCell(r.key, 'name', e.target.value)}
                            placeholder="Nombre"
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                              r.errors?.name ? 'border-red-400' : 'border-gray-300'
                            }`}
                            required
                          />
                          {r.errors?.name && <p className="mt-1 text-xs text-red-600">{r.errors.name}</p>}
                        </div>

                        <div>
                          <label
                            htmlFor={lastNameMobileId}
                            className="mb-1 block text-xs text-gray-600"
                          >
                            Apellidos *
                          </label>
                          <input
                            id={lastNameMobileId}
                            value={r.lastName}
                            onChange={e => updateCell(r.key, 'lastName', e.target.value)}
                            placeholder="Apellidos"
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                              r.errors?.lastName ? 'border-red-400' : 'border-gray-300'
                            }`}
                            required
                          />
                          {r.errors?.lastName && <p className="mt-1 text-xs text-red-600">{r.errors.lastName}</p>}
                        </div>

                        <div>
                          <label
                            htmlFor={emailMobileId}
                            className="mb-1 block text-xs text-gray-600"
                          >
                            Email *
                          </label>
                          <input
                            id={emailMobileId}
                            value={r.email}
                            onChange={e => updateCell(r.key, 'email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                              r.errors?.email ? 'border-red-400' : 'border-gray-300'
                            }`}
                            type="email"
                            required
                          />
                          {r.errors?.email && <p className="mt-1 text-xs text-red-600">{r.errors.email}</p>}
                        </div>

                        <div>
                          <label
                            htmlFor={passwordMobileId}
                            className="mb-1 block text-xs text-gray-600"
                          >
                            Contraseña *
                          </label>
                          <div className="relative">
                            <input
                              id={passwordMobileId}
                              value={r.password}
                              onChange={e => updateCell(r.key, 'password', e.target.value)}
                              placeholder="Contraseña"
                              className="w-full rounded-lg border border-gray-300 px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              type={passwordVisible ? 'text' : 'password'}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(r.key)}
                              className="absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-gray-500 hover:text-gray-700"
                              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {r.errors?.password && (
                            <p className="mt-1 text-xs text-red-600">{r.errors.password}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acciones (responsive) */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Plus size={18} />
              Añadir fila
            </button>

            <button
              type="button"
              onClick={openAdminModal}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <Plus size={18} />
              Registrar admin
            </button>

            <button
              type="submit"
              disabled={submitting || hasErrors || allEmpty}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white ${
                submitting || hasErrors || allEmpty
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4l3.464-3.464A12 12 0 004 12z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar todo
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          Consejo: puedes rellenar unas cuantas filas y guardar, luego volver a añadir más.
        </p>
      </div>
    </PageWithHeader>
  );
};

export default SupervisorBulkStudents;
