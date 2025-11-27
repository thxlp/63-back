# สคริปต์ช่วยตั้งค่าไฟล์ .env
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ตั้งค่า Supabase Environment Variables" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ตรวจสอบว่ามีไฟล์ .env อยู่แล้วหรือไม่
if (Test-Path .env) {
    Write-Host "⚠️  พบไฟล์ .env อยู่แล้ว" -ForegroundColor Yellow
    $overwrite = Read-Host "ต้องการเขียนทับหรือไม่? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ ยกเลิกการตั้งค่า" -ForegroundColor Red
        exit
    }
}

Write-Host "`n📝 กรุณากรอกข้อมูล Supabase ของคุณ:`n" -ForegroundColor Green
Write-Host "   ไปที่ https://app.supabase.com" -ForegroundColor White
Write-Host "   เลือกโปรเจคของคุณ → Settings → API`n" -ForegroundColor White

# ขอ SUPABASE_URL
$supabaseUrl = Read-Host "SUPABASE_URL (เช่น: https://xxxxxxxxxxxxx.supabase.co)"
while ($supabaseUrl -eq "" -or -not $supabaseUrl.StartsWith("https://")) {
    if ($supabaseUrl -ne "") {
        Write-Host "❌ URL ต้องเริ่มด้วย https://" -ForegroundColor Red
    }
    $supabaseUrl = Read-Host "SUPABASE_URL"
}

# ขอ SUPABASE_ANON_KEY
$anonKey = Read-Host "SUPABASE_ANON_KEY (anon public key)"
while ($anonKey -eq "") {
    Write-Host "❌ กรุณากรอก ANON_KEY" -ForegroundColor Red
    $anonKey = Read-Host "SUPABASE_ANON_KEY"
}

# ขอ SUPABASE_SERVICE_ROLE_KEY (optional)
$serviceRoleKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY (service_role key - กด Enter เพื่อข้าม)"
if ($serviceRoleKey -eq "") {
    Write-Host "⚠️  ข้าม SERVICE_ROLE_KEY (อาจมีปัญหาเกี่ยวกับ RLS)" -ForegroundColor Yellow
}

# ขอ PORT
$port = Read-Host "PORT (กด Enter สำหรับ 3002)"
if ($port -eq "") {
    $port = "3002"
}

# สร้างเนื้อหาไฟล์ .env
$envContent = @"
# Supabase Configuration
SUPABASE_URL=$supabaseUrl
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey

# Server Configuration
PORT=$port
NODE_ENV=development
"@

# เขียนไฟล์ .env
try {
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host "`n✅ สร้างไฟล์ .env สำเร็จแล้ว!`n" -ForegroundColor Green
    
    # แสดงตัวอย่างเนื้อหา (ซ่อน key บางส่วน)
    Write-Host "📄 ตัวอย่างเนื้อหาในไฟล์ .env:" -ForegroundColor Cyan
    Write-Host "   SUPABASE_URL=$supabaseUrl" -ForegroundColor White
    Write-Host "   SUPABASE_ANON_KEY=$($anonKey.Substring(0, [Math]::Min(20, $anonKey.Length)))..." -ForegroundColor White
    if ($serviceRoleKey -ne "") {
        Write-Host "   SUPABASE_SERVICE_ROLE_KEY=$($serviceRoleKey.Substring(0, [Math]::Min(20, $serviceRoleKey.Length)))..." -ForegroundColor White
    }
    Write-Host "   PORT=$port" -ForegroundColor White
    Write-Host "   NODE_ENV=development`n" -ForegroundColor White
    
    Write-Host "🚀 พร้อมรัน server แล้ว! ใช้คำสั่ง: npm run dev" -ForegroundColor Green
} catch {
    Write-Host "`n❌ เกิดข้อผิดพลาด: $_" -ForegroundColor Red
    exit 1
}




