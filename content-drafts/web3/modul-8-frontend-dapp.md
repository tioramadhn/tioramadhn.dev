---
title: "Modul 8: Membangun Frontend dApp dengan viem dan wagmi"
description: Contract terbaik di dunia tidak berguna kalau tidak ada yang bisa memakainya. Membangun jembatan antara Bu Siti dan smart contract.
date: 2026-10-17
slug: modul-8-frontend-dapp
tags: tutorial web 3
series: Tutorial Web 3
status: draft
---

Di akhir modul sebelumnya kita melihat arisan dari sisi Bu Siti: untuk setor iuran, ia harus membuka Etherscan, memanggil `approve` di contract token dengan angka dalam satuan terkecil, lalu memanggil `setor` di contract lain.

Tidak ada warga yang mau melakukan itu.

Modul ini membangun jembatannya. Contract-nya tetap sama persis; yang berubah hanya cara pengguna berinteraksi dengannya.

## Kenapa frontend Web3 berbeda

| Aspek | Web 2 | dApp |
| --- | --- | --- |
| Login | Email + password ke server Anda | Wallet pengguna, tanpa akun di server |
| Siapa yang menandatangani | Server Anda, atas nama pengguna | Pengguna sendiri, di wallet-nya |
| Data | Database Anda, cepat | Blockchain lewat RPC, lebih lambat |
| Konfirmasi aksi | Instan | Menunggu transaksi masuk blok |
| Kegagalan | Error dari server | Pengguna menolak, gas kurang, revert, salah jaringan |
| Langkah per aksi | Satu klik | Kadang dua transaksi (approve + aksi) |

Tanpa library yang baik, Anda harus mengurus sendiri: mendeteksi wallet, mendengarkan pergantian akun dan jaringan, mengodekan panggilan sesuai ABI, menunggu receipt, memuat ulang data, dan menerjemahkan error.

## Analogi: teller bank dan slip setoran

- **Brankas bank** menyimpan uang dengan aturan ketat. Anda tidak bisa menyentuhnya langsung.
- **Teller** membantu mengisi slip, menunjukkan saldo, menjelaskan langkahnya.
- **Tanda tangan di slip tetap Anda yang membubuhkan.** Teller tidak boleh memalsukannya.
- Setelah diproses, teller memberi **bukti setoran**.
- Teller yang jujur menjelaskan isi slip dengan benar. Teller yang curang bisa menyodorkan slip berisi hal lain dan berharap Anda menandatangani tanpa membaca.

| Bank | dApp |
| --- | --- |
| Brankas dengan aturan ketat | **Smart contract** |
| Teller | **Frontend dApp** (React + wagmi) |
| Slip yang sudah terisi | Panggilan contract yang disusun frontend |
| Tanda tangan nasabah | Persetujuan di **wallet** |
| Petugas yang mengantar slip | **RPC provider** |
| Bukti setoran | **Transaction receipt** |
| Teller yang curang | Frontend yang disusupi |

Baris terakhir itu bukan hipotesis. Pada Desember 2021, penyerang menyusupkan skrip berbahaya ke frontend BadgerDAO lewat layanan infrastruktur web yang dipakai situs itu. **Smart contract-nya sendiri tidak bermasalah.** Skrip itu diam-diam menyisipkan permintaan `approve` tanpa batas ke alamat penyerang saat pengguna melakukan transaksi biasa. Banyak pengguna menyetujuinya tanpa membaca, dan dana lebih dari 100 juta dolar dikuras.

Frontend adalah bagian dari keamanan. Ini juga contoh sentralisasi tersembunyi: contract terdesentralisasi, tapi pintu masuknya terpusat.

## Arsitekturnya

```text
Pengguna
   |
   v
Frontend React + wagmi
   |                 \
   | membaca          \ minta tanda tangan
   | (readContract)    v
   |                 Wallet (MetaMask)
   |                   |
   v                   v  transaksi bertanda tangan
RPC provider / Anvil <-+
   |
   v
Blockchain (contract Token & Arisan)
```

**Membaca** tidak melibatkan wallet, karena frontend langsung bertanya ke RPC, gratis. **Menulis** selalu lewat wallet; frontend hanya menyusun permintaan.

Hook wagmi yang dipakai:

| Hook | Fungsi |
| --- | --- |
| `useConnection` | Alamat, status terhubung, jaringan saat ini |
| `useConnectors` | Daftar wallet yang tersedia |
| `useConnect` / `useDisconnect` | Menghubungkan dan memutuskan |
| `useReadContract` | Membaca satu function view |
| `useReadContracts` | Membaca banyak function dalam satu permintaan |
| `useWriteContract` | Meminta wallet menandatangani dan mengirim |
| `useWaitForTransactionReceipt` | Menunggu transaksi masuk blok |

Kode di modul ini memakai **wagmi versi 3** dan **viem versi 2**. Di wagmi 2 beberapa nama berbeda: `useAccount` (kini `useConnection`) dan `writeContract` (kini `mutate`). Kalau Anda membaca tutorial lama, perhatikan versinya.

## Siklus hidup transaksi di UI

```text
  Siap
   |  klik tombol (mutate)
   v
Menunggu tanda tangan ---- pengguna menolak / simulasi revert ----> Gagal
   |  hash diterima
   v
Menunggu blok ------------ receipt status reverted ---------------> Gagal
   |  receipt status success
   v
Berhasil --> muat ulang data (invalidateQueries) --> Siap
```

Setiap status harus terlihat pengguna, dan tombol harus dinonaktifkan selama proses agar tidak ada transaksi ganda.

## Praktik

Kita pakai contract `PoinWarga` dan `ArisanToken` dari modul sebelumnya.

```solidity
// script/DeployArisanToken.s.sol
contract DeployArisanToken is Script {
    function run() external {
        vm.startBroadcast();
        PoinWarga poin = new PoinWarga();
        ArisanToken arisan = new ArisanToken(poin, 50_000, 3);
        vm.stopBroadcast();
        console.log("PoinWarga  :", address(poin));
        console.log("ArisanToken:", address(arisan));
    }
}
```

```bash
# Terminal 1
anvil

# Terminal 2: private key di bawah adalah akun #0, #1, #2 Anvil yang PUBLIK, khusus lokal
PK0=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PK1=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
PK2=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
R=http://127.0.0.1:8545

forge script script/DeployArisanToken.s.sol --rpc-url $R --private-key $PK0 --broadcast

POIN=0x5FbDB2315678afecb367f032d93F642f64180aa3
ARISAN=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

for A in 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; do
  cast send $POIN "cetak(address,uint256)" $A 150000 --private-key $PK0 --rpc-url $R
done
for K in $PK0 $PK1 $PK2; do
  cast send $ARISAN "gabung()" --private-key $K --rpc-url $R
done
```

Di MetaMask, tambahkan jaringan manual: RPC `http://127.0.0.1:8545`, Chain ID `31337`. Impor akun dengan private key akun #1 Anvil, yang **kuncinya publik dan jangan pernah dipakai di mainnet**. Kalau Anvil dijalankan ulang, hapus data aktivitas akun di pengaturan lanjutan MetaMask agar nonce-nya sinkron.

```bash
npm create vite@latest arisan-dapp -- --template react-ts
cd arisan-dapp && npm install
npm install wagmi viem@2 @tanstack/react-query
```

### Konfigurasi

```ts
// src/wagmi.ts
import { createConfig, http, injected } from 'wagmi'
import { foundry, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [foundry, sepolia],
  connectors: [injected()], // wallet yang tertanam di browser
  transports: {
    [foundry.id]: http(),   // Anvil
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
  },
})

// Membuat semua hook wagmi mengenali tipe config ini
declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
```

```ts
// src/main.tsx
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
```

### Tombol hubungkan wallet

```ts
// src/Koneksi.tsx
import { useConnect, useConnection, useConnectors, useDisconnect } from 'wagmi'

export function Koneksi() {
  const { address, isConnected, chain } = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()
  const disconnect = useDisconnect()

  if (isConnected) {
    return (
      <section>
        <p>✅ Terhubung: <code>{address}</code></p>
        <p>Jaringan: {chain?.name ?? 'tidak didukung'}</p>
        <button onClick={() => disconnect.mutate()}>Putuskan</button>
      </section>
    )
  }

  return (
    <section>
      {connectors.map((connector) => (
        <button key={connector.uid} onClick={() => connect.mutate({ connector })}>
          Hubungkan {connector.name}
        </button>
      ))}
      {connect.error && <p className="galat">Gagal: {connect.error.message}</p>}
    </section>
  )
}
```

Coba ganti akun di MetaMask. Alamat di layar ikut berubah tanpa memuat ulang halaman.

### ABI dan alamat

```ts
// src/kontrak.ts
import { parseAbi } from 'viem'

export const ALAMAT_POIN = import.meta.env.VITE_ALAMAT_POIN as `0x${string}`
export const ALAMAT_ARISAN = import.meta.env.VITE_ALAMAT_ARISAN as `0x${string}`

// ABI dalam format yang mudah dibaca manusia. Cukup function yang dipakai frontend.
export const abiPoin = parseAbi([
  'function balanceOf(address akun) view returns (uint256)',
  'function allowance(address pemilik, address spender) view returns (uint256)',
  'function approve(address spender, uint256 jumlah) returns (bool)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
])

export const abiArisan = parseAbi([
  'function iuran() view returns (uint256)',
  'function jumlahAnggota() view returns (uint256)',
  'function putaran() view returns (uint256)',
  'function jumlahSetorPutaranIni() view returns (uint256)',
  'function adalahAnggota(address akun) view returns (bool)',
  'function sudahSetor(uint256 putaran, address akun) view returns (bool)',
  'function bisaDitarik(address akun) view returns (uint256)',
  'function setor()',
  'function tetapkanPemenang()',
  'function tarik()',
  // Daftarkan error agar viem bisa menampilkan namanya saat transaksi gagal
  'error BukanAnggota()',
  'error SudahSetor()',
  'error BelumSemuaSetor()',
])
```

### Menampilkan data

```ts
// src/InfoArisan.tsx
const arisan = { address: ALAMAT_ARISAN, abi: abiArisan } as const

export function InfoArisan() {
  const { address } = useConnection()

  // Beberapa pembacaan sekaligus dalam satu permintaan
  const { data, isPending } = useReadContracts({
    contracts: [
      { ...arisan, functionName: 'iuran' },
      { ...arisan, functionName: 'jumlahAnggota' },
      { ...arisan, functionName: 'putaran' },
      { ...arisan, functionName: 'jumlahSetorPutaranIni' },
    ],
  })

  const { data: saldo } = useReadContract({
    address: ALAMAT_POIN,
    abi: abiPoin,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }, // jangan membaca sebelum wallet terhubung
  })

  if (isPending) return <p>Memuat data arisan…</p>
  const [iuran, jumlahAnggota, putaran, sudahSetor] = data!.map((d) => d.result as bigint)

  return (
    <section>
      <ul>
        <li>Iuran per putaran: <b>{iuran?.toString()}</b> PWR</li>
        <li>Putaran: <b>{putaran?.toString()}</b> dari {jumlahAnggota?.toString()}</li>
        <li>Sudah setor putaran ini: <b>{sudahSetor?.toString()}</b> orang</li>
        {address && <li>Saldo PWR Anda: <b>{saldo?.toString() ?? '…'}</b></li>}
      </ul>
    </section>
  )
}
```

Hasil pembacaan bertipe `bigint`, jadi tampilkan dengan `.toString()`.

### Tombol setor dengan alur approve

Inilah inti modul ini: alih-alih memaksa pengguna memahami `approve`, frontend memeriksa `allowance` dan menampilkan tombol yang tepat.

```ts
// src/TombolSetor.tsx
export function TombolSetor() {
  const { address } = useConnection()
  const queryClient = useQueryClient()
  const tulis = useWriteContract()
  const struk = useWaitForTransactionReceipt({ hash: tulis.data })

  const { data } = useReadContracts({
    contracts: [
      { address: ALAMAT_ARISAN, abi: abiArisan, functionName: 'iuran' },
      { address: ALAMAT_ARISAN, abi: abiArisan, functionName: 'putaran' },
      { address: ALAMAT_ARISAN, abi: abiArisan, functionName: 'adalahAnggota', args: [address!] },
      { address: ALAMAT_POIN, abi: abiPoin, functionName: 'allowance', args: [address!, ALAMAT_ARISAN] },
    ],
    query: { enabled: !!address },
  })
  const [iuran, putaran, anggota, izin] = data?.map((d) => d.result) ?? []

  // Setelah transaksi masuk blok, muat ulang semua data dari blockchain
  useEffect(() => {
    if (struk.isSuccess) queryClient.invalidateQueries()
  }, [struk.isSuccess, queryClient])

  if (!address || data === undefined) return null
  if (!anggota) return <p>Alamat Anda bukan anggota arisan ini.</p>

  const sibuk = tulis.isPending || struk.isLoading
  const perluIzin = (izin as bigint) < (iuran as bigint)

  const izinkan = () =>
    tulis.mutate({ address: ALAMAT_POIN, abi: abiPoin, functionName: 'approve',
                   args: [ALAMAT_ARISAN, iuran as bigint] })  // izinkan SEBESAR IURAN saja
  const setor = () =>
    tulis.mutate({ address: ALAMAT_ARISAN, abi: abiArisan, functionName: 'setor' })

  return (
    <section>
      {perluIzin ? (
        <button onClick={izinkan} disabled={sibuk}>Langkah 1: Izinkan {String(iuran)} PWR</button>
      ) : (
        <button onClick={setor} disabled={sibuk}>Langkah 2: Setor Iuran</button>
      )}
      <p>
        {tulis.isPending && '✍️ Menunggu tanda tangan di wallet…'}
        {struk.isLoading && '⏳ Menunggu transaksi masuk blok…'}
        {struk.isSuccess && !sibuk && '✅ Transaksi berhasil.'}
      </p>
      {tulis.error && (
        <p className="galat">Gagal: {(tulis.error as BaseError).shortMessage ?? tulis.error.message}</p>
      )}
    </section>
  )
}
```

Tiga hal yang membuat ini ramah: izin diberikan **sebesar iuran saja**, bukan tanpa batas; setiap status transaksi ditampilkan; dan `invalidateQueries` memuat ulang data setelah berhasil sehingga pengguna tidak melihat angka basi.

Hasil uji dengan akun #1 Anvil: sebelum setor, saldo 150000 dan "sudah setor 0 orang". Setelah klik Langkah 1 dan menyetujui, tombol berubah jadi Langkah 2. Setelah klik Langkah 2, muncul konfirmasi, jumlah penyetor jadi 1, dan saldo jadi 100000.

**Tantangan bonus:** tambahkan tombol "Tetapkan Pemenang" yang hanya aktif kalau semua sudah setor, tombol "Tarik Dana" yang hanya tampil kalau `bisaDitarik` lebih dari 0, dan peringatan jaringan salah dengan tombol pindah jaringan (`useSwitchChain`).

## Yang harus diwaspadai

Frontend dApp sering jadi titik terlemah: contract-nya aman, tapi websitenya bisa dipalsukan, disusupi, atau membingungkan pengguna sampai menandatangani hal yang salah.

1. **Frontend terpusat.** Website biasanya di-hosting di satu layanan. Domain bisa dibajak, skrip bisa disusupi.
2. **Situs palsu.** Penipu mudah meniru tampilan dApp populer.
3. **UX yang kompleks.** Dua transaksi untuk satu aksi, menunggu blok, error membingungkan.
4. **Bergantung pada RPC.** Kalau RPC lambat atau membatasi permintaan, aplikasi terasa rusak.
5. **Data bisa basi.** Kalau tampilan tidak dimuat ulang, pengguna melihat angka lama dan mungkin mengirim transaksi yang pasti gagal.
6. **Ekosistem cepat berubah.** API library berganti antarversi.

## Rangkuman

- **Frontend dApp** adalah "teller" yang menyusun permintaan. Pengguna menandatangani di wallet, contract menjalankan aturan.
- **Membaca** langsung lewat RPC, gratis. **Menulis** selalu lewat tanda tangan wallet.
- Transaksi di UI punya siklus: menunggu tanda tangan → menunggu blok → berhasil/gagal. Tampilkan semuanya.
- Sembunyikan kerumitan approve dengan memeriksa `allowance`, dan izinkan secukupnya.
- Frontend adalah bagian dari keamanan.

## Masalah terbuka

RT 05 ingin menerbitkan **tiket NFT** untuk acara 17 Agustus, lengkap dengan gambar dan detail acara. Muncul tiga masalah sekaligus:

1. **Gambar dan detail tiket** terlalu mahal disimpan di contract. Tapi kalau disimpan di server biasa, tiket "hilang" saat server mati.
2. **Harga tiket** ingin dipatok dalam rupiah, padahal contract tidak tahu kurs ETH ke rupiah dan tidak bisa mengakses internet.
3. **Halaman "Riwayat Tiket Saya"** butuh daftar semua transfer tiket. Membaca ribuan event satu per satu dari RPC sangat lambat.

Di mana data besar disimpan, bagaimana contract mendapat data dunia nyata, dan bagaimana frontend mencari data blockchain dengan cepat?

Itulah modul berikutnya.
