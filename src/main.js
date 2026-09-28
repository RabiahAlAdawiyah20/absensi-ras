import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import './style.css';

const SUPABASE_URL = 'https://eexhnynncmsnpmmzwmeo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JqujEHHPpUqAkhqsdY1bzA_kWS-fak7';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById('app');

let currentUser = null;
let currentProfile = null;

function today() {
  return new Date().toISOString().split('T')[0];
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loading(text = 'Memuat...') {
  app.innerHTML = `
    <div class="container">
      <div class="card" style="text-align:center">
        <h2>${esc(text)}</h2>
      </div>
    </div>
  `;
}

function loginPage() {
  app.innerHTML = `
    <div class="container" style="max-width:480px;padding-top:70px">
      <div class="card">
        <div style="text-align:center;margin-bottom:25px">
          <h1>Absensi Karyawan</h1>
          <p style="color:#666">Sistem Presensi Karyawan</p>
        </div>

        <form id="loginForm">
          <label>Email</label>
          <input id="email" type="email" placeholder="Masukkan email" required>

          <label>Password</label>
          <input id="password" type="password" placeholder="Masukkan password" required>

          <button type="submit" style="width:100%">Masuk</button>

          <p id="loginError" style="color:#dc2626;margin-top:15px"></p>
        </form>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('loginError');

    error.textContent = 'Memproses login...';

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      error.textContent = loginError.message;
      return;
    }

    currentUser = data.user;
    await loadProfile();
  });
}

async function loadProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    app.innerHTML = `
      <div class="container">
        <div class="card">
          <h2>Profil tidak ditemukan</h2>
          <p>${esc(error.message)}</p>
          <button id="logoutBtn">Keluar</button>
        </div>
      </div>
    `;

    document.getElementById('logoutBtn').onclick = logout;
    return;
  }

  currentProfile = data;

  if (data.role === 'HRD') {
    await hrdDashboard();
  } else {
    await employeeDashboard();
  }
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  loginPage();
}

function header(title) {
  return `
    <div style="
      background:white;
      padding:18px 20px;
      box-shadow:0 2px 10px rgba(0,0,0,.06);
      margin-bottom:20px;
    ">
      <div class="container" style="padding:0;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <strong style="font-size:20px">${esc(title)}</strong>
          <div style="font-size:13px;color:#666">
            ${esc(currentProfile?.full_name || '')}
          </div>
        </div>

        <button id="logoutBtn" class="btn-danger">Keluar</button>
      </div>
    </div>
  `;
}

async function hrdDashboard() {
  loading('Memuat dashboard HRD...');

  const { data: employees = [] } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  const { data: attendance = [] } = await supabase
    .from('attendance')
    .select('*')
    .eq('attendance_date', today());

  const employeeCount = employees.filter(x => x.role === 'KARYAWAN').length;
  const present = attendance.filter(x => x.check_in).length;
  const late = attendance.filter(x => x.status === 'TERLAMBAT').length;

  app.innerHTML = `
    ${header('Dashboard HRD')}

    <div class="container">

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:15px;
        margin-bottom:20px;
      ">
        <div class="card">
          <div style="color:#666">Total Karyawan</div>
          <h2>${employeeCount}</h2>
        </div>

        <div class="card">
          <div style="color:#666">Hadir Hari Ini</div>
          <h2>${present}</h2>
        </div>

        <div class="card">
          <div style="color:#666">Terlambat</div>
          <h2>${late}</h2>
        </div>
      </div>

      <div class="card">
        <h2>Menu HRD</h2>

        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <button id="addEmployeeBtn">
            + Tambah Karyawan
          </button>

          <button id="employeeBtn">
            👥 Data Karyawan
          </button>

          <button id="attendanceBtn">
            📋 Absensi Hari Ini
          </button>

          <button id="exportBtn">
            📥 Export Excel
          </button>
        </div>
      </div>

      <div id="hrdContent"></div>
    </div>
  `;

  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('addEmployeeBtn').onclick = addEmployeePage;
  document.getElementById('employeeBtn').onclick = employeeList;
  document.getElementById('attendanceBtn').onclick = attendanceList;
  document.getElementById('exportBtn').onclick = exportExcel;
}

function addEmployeePage() {
  document.getElementById('hrdContent').innerHTML = `
    <div class="card">
      <h2>Tambah Karyawan</h2>
      <p style="color:#666">
        Buat akun login karyawan baru.
      </p>

      <form id="employeeForm">

        <label>NIK</label>
        <input
          id="nik"
          placeholder="Contoh: KRY001"
          required
        >

        <label>Nama Lengkap</label>
        <input
          id="fullName"
          placeholder="Nama lengkap karyawan"
          required
        >

        <label>Email</label>
        <input
          id="employeeEmail"
          type="email"
          placeholder="email@perusahaan.com"
          required
        >

        <label>Password Awal</label>
        <input
          id="employeePassword"
          type="password"
          placeholder="Minimal 6 karakter"
          minlength="6"
          required
        >

        <button type="submit">
          Simpan Karyawan
        </button>

        <p id="employeeMessage" style="margin-top:15px"></p>
      </form>
    </div>
  `;

  document.getElementById('employeeForm').addEventListener('submit', createEmployee);
}

async function createEmployee(e) {
  e.preventDefault();

  const message = document.getElementById('employeeMessage');

  const nik = document.getElementById('nik').value.trim();
  const full_name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('employeeEmail').value.trim();
  const password = document.getElementById('employeePassword').value;

  if (password.length < 6) {
    message.style.color = '#dc2626';
    message.textContent = 'Password minimal 6 karakter.';
    return;
  }

  message.style.color = '#555';
  message.textContent = 'Membuat akun karyawan...';

  const { data, error } = await supabase.functions.invoke(
    'create-employee',
    {
      body: {
        nik,
        full_name,
        email,
        password
      }
    }
  );

  if (error) {
    message.style.color = '#dc2626';
    message.textContent =
      error.message || 'Gagal membuat karyawan.';
    return;
  }

  if (data?.error) {
    message.style.color = '#dc2626';
    message.textContent = data.error;
    return;
  }

  message.style.color = '#16a34a';
  message.textContent =
    '✅ Karyawan berhasil dibuat.';

  document.getElementById('employeeForm').reset();

  setTimeout(employeeList, 800);
}

async function employeeList() {
  const content = document.getElementById('hrdContent');

  content.innerHTML = `
    <div class="card">
      <h2>Data Karyawan</h2>
      <p>Memuat data...</p>
    </div>
  `;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'KARYAWAN')
    .order('full_name');

  if (error) {
    content.innerHTML = `
      <div class="card">
        <h2>Data Karyawan</h2>
        <p style="color:#dc2626">${esc(error.message)}</p>
      </div>
    `;
    return;
  }

  if (!data?.length) {
    content.innerHTML = `
      <div class="card">
        <h2>Data Karyawan</h2>
        <p>Belum ada karyawan.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <h2>Data Karyawan</h2>

      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>NIK</th>
              <th>Nama</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>
            ${data.map(emp => `
              <tr>
                <td>${esc(emp.nik)}</td>
                <td>${esc(emp.full_name)}</td>
                <td>${esc(emp.role)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function attendanceList() {
  const content = document.getElementById('hrdContent');

  content.innerHTML = `
    <div class="card">
      <h2>Absensi Hari Ini</h2>
      <p>Memuat...</p>
    </div>
  `;

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('attendance_date', today())
    .order('check_in');

  if (error) {
    content.innerHTML = `
      <div class="card">
        <p style="color:#dc2626">${esc(error.message)}</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <h2>Absensi ${today()}</h2>

      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Masuk</th>
              <th>Pulang</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${
              data?.length
              ? data.map(row => `
                <tr>
                  <td>${esc(row.user_id)}</td>
                  <td>${esc(row.check_in || '-')}</td>
                  <td>${esc(row.check_out || '-')}</td>
                  <td>${esc(row.status || '-')}</td>
                </tr>
              `).join('')
              : `
                <tr>
                  <td colspan="4">Belum ada absensi.</td>
                </tr>
              `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function exportExcel() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('attendance_date', { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  const rows = (data || []).map(row => ({
    Tanggal: row.attendance_date,
    User_ID: row.user_id,
    Check_In: row.check_in,
    Check_Out: row.check_out,
    Status: row.status,
    Catatan: row.notes
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Absensi'
  );

  XLSX.writeFile(
    workbook,
    `Rekap_Absensi_${today()}.xlsx`
  );
}

async function employeeDashboard() {
  loading('Memuat dashboard...');

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('attendance_date', today())
    .maybeSingle();

  app.innerHTML = `
    ${header('Absensi Karyawan')}

    <div class="container">

      <div class="card">
        <h2>Halo, ${esc(currentProfile.full_name)} 👋</h2>
        <p>NIK: ${esc(currentProfile.nik)}</p>
        <p>Tanggal: ${today()}</p>
      </div>

      <div class="card">
        <h2>Absensi Hari Ini</h2>

        <p>
          Check-in:
          <strong>${esc(attendance?.check_in || '-')}</strong>
        </p>

        <p>
          Check-out:
          <strong>${esc(attendance?.check_out || '-')}</strong>
        </p>

        <p>
          Status:
          <strong>${esc(attendance?.status || 'Belum Absen')}</strong>
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap">

          <button
            id="checkInBtn"
            class="btn-success"
            ${attendance?.check_in ? 'disabled' : ''}
          >
            🕐 Check In
          </button>

          <button
            id="checkOutBtn"
            class="btn-danger"
            ${!attendance?.check_in || attendance?.check_out ? 'disabled' : ''}
          >
            🕐 Check Out
          </button>

        </div>

        <p id="attendanceMessage"></p>
      </div>

      <div class="card">
        <h2>Riwayat Absensi</h2>
        <div id="history">Memuat...</div>
      </div>

    </div>
  `;

  document.getElementById('logoutBtn').onclick = logout;

  document.getElementById('checkInBtn').onclick =
    checkIn;

  document.getElementById('checkOutBtn').onclick =
    checkOut;

  await loadHistory();
}

async function checkIn() {
  const message =
    document.getElementById('attendanceMessage');

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('attendance')
    .insert({
      user_id: currentUser.id,
      attendance_date: today(),
      check_in: now,
      status: 'HADIR'
    });

  if (error) {
    message.style.color = '#dc2626';
    message.textContent = error.message;
    return;
  }

  message.style.color = '#16a34a';
  message.textContent = '✅ Check-in berhasil.';

  setTimeout(employeeDashboard, 500);
}

async function checkOut() {
  const message =
    document.getElementById('attendanceMessage');

  const { data, error } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('attendance_date', today())
    .maybeSingle();

  if (error || !data) {
    message.style.color = '#dc2626';
    message.textContent =
      'Data absensi tidak ditemukan.';
    return;
  }

  const { error: updateError } = await supabase
    .from('attendance')
    .update({
      check_out: new Date().toISOString()
    })
    .eq('id', data.id);

  if (updateError) {
    message.style.color = '#dc2626';
    message.textContent = updateError.message;
    return;
  }

  message.style.color = '#16a34a';
  message.textContent = '✅ Check-out berhasil.';

  setTimeout(employeeDashboard, 500);
}

async function loadHistory() {
  const history =
    document.getElementById('history');

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('attendance_date', {
      ascending: false
    })
    .limit(30);

  if (error) {
    history.innerHTML =
      `<p style="color:#dc2626">${esc(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    history.innerHTML =
      '<p>Belum ada riwayat absensi.</p>';
    return;
  }

  history.innerHTML = `
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Masuk</th>
            <th>Pulang</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${data.map(row => `
            <tr>
              <td>${esc(row.attendance_date)}</td>
              <td>${esc(row.check_in || '-')}</td>
              <td>${esc(row.check_out || '-')}</td>
              <td>${esc(row.status || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function start() {
  loading('Memeriksa sesi...');

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    loginPage();
    return;
  }

  currentUser = session.user;
  await loadProfile();
}

supabase.auth.onAuthStateChange(
  async (_event, session) => {
    if (!session) {
      currentUser = null;
      currentProfile = null;
      loginPage();
    }
  }
);

start();
