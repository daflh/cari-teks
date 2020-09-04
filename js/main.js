new Vue({
    el: "#app",
    data: {
        url: "",
        keyword: "",
        lang: "en",
        size: 10,
        expand: false,
        info: "",
        result: {
            data: [],
            page: null,
            isLast: null
        }
    },
    computed: {
        // helper data, jalankan watcher ketika salah satu dari data-nya berubah
        inputChange: function() {
            return [this.url, this.keyword, this.lang, this.size];
        },
        // mengambil Youtube video ID dari url video yang diberikan
        videoId: function() {
            if (this.url === "") return false;
            // tambahkan protokol pada url kalau blm ada
            let url = this.url.search(/^https?:\/\//) !== -1 ? this.url : `http://${this.url}`;
            let params = new URL(url).searchParams;
            if (!params.has("v")) return false;
            return params.get("v");
        }
    },
    watch: {
        // jalankan fungsi ketika value inputChange berubah
        inputChange: debounce(async function() {
            this.result = {
                data: [],
                page: null,
                isLast: null
            };
            let validSize = false;
            if (this.size >= 5 && this.size <= 500) {
                validSize = true;
                // kalau size yang di input valid, simpan ke localstorage
                localStorage.setItem("size", this.size);
            }
            if (this.url === "") return this.info = "Masukkan URL video";
            if (!this.videoId) return this.info = "Format URL salah";
            if (!validSize) return this.info = "Masukkan angka dengan range 5 - 500";
            if (this.keyword) {
                if (this.keyword.length >= 2) {
                    // load ulang result kalau semua sudah valid
                    await this.load();
                } else {
                    this.info = "Kata kunci minimal 2 karakter";
                }
            } else {
                this.info = "Masukkan kata kunci yang ingin dicari";
            }
        }, 500),
        // selalu simpan ke localstorage walaupun blm dicek valid atau tidak
        url: debounce((url) => localStorage.setItem("url", url), 300),
        lang: (lang) => localStorage.setItem("lang", lang),
        expand: (expand) => localStorage.setItem("expand", expand)
    },
    created: function() {
        // ambil data yang disimpan localstorage setiap instance Vue dibuat
        const url = localStorage.getItem("url");
        const lang = localStorage.getItem("lang");
        const size = localStorage.getItem("size");
        const expand = localStorage.getItem("expand");
        if (url !== null) {
            this.url = url;
        } else {
            this.info = "Masukkan URL video";
        }
        if (lang !== null) this.lang = lang;
        if (size !== null) this.size = Number(size);
        if (expand !== null) this.expand = (expand === "true");
    },
    methods: {
        async load() {
            // jangan dijalankan kalau masih load() sebelumnya blm selesai
            if (this.info === "...") return;
            // informasi loading sementara melakukan fetch
            this.info = "...";

            const queries = {
                v: this.videoId,
                lang: this.lang,
                key: this.keyword,
                marker: "<mark>_$_</mark>",
                size: this.size,
                page: this.result.page + 1
            };
            const requestUrl = "http://yt-transcripts.vercel.app/api?" + this.serialize(queries);
            // ambil data json melalui fetch ke 'requestUrl'
            const respond = await fetch(requestUrl).then((res) => (res.ok ? res.json() : []));

            if (respond.data.length > 0) {
                // 'start' dibulatkan kebawah
                respond.data = respond.data.map((item) => {
                    item.start = Math.floor(item.start);
                    return item;
                });
                // gabungkan data sebelumnya dengan data yang baru di fetch
                const combinedData = this.result.data.concat(respond.data);
                this.info = `Menampilkan ${combinedData.length} dari ${respond.search.found} hasil ditemukan`;
                this.result.data = combinedData;
                this.result.page = respond.page;
                // kalau page saat ini sama dengan total pages, berarti sudah page terakhir
                this.result.isLast = (respond.page === respond.total_pages);
            } else {
                this.info = `Tidak menemukan hasil dengan kata kunci "${this.keyword}"`;
            }
        },
        // mengubah angka (detik) yang di input ke format mm:ss / hh:mm:ss
        formatTime(seconds) {
            const milliseconds = seconds * 1000;
            let result = new Date(milliseconds).toISOString().substr(11, 8);
            if (result.startsWith("00")) {
                result = result.substr(3);
            }
            return result.startsWith("0") ? result.substr(1) : result;
        },
        // ubah object yang di input ke query string
        serialize(obj) {
            let qs = [];
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    qs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
                }
            }
            return qs.join("&");
        }
    }
});

// saat development tdk perlu menggunakan service worker
if ('serviceWorker' in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
    navigator.serviceWorker.register('/sw.js').then((data) => {
        console.log("Registrasi service worker berhasil!");
    }).catch((err) => {
        console.log('Yahh, registrasi service worker gagal', err);
    });
}

// membatasi pemanggilan suatu fungsi untuk waktu yang ditentukan
// https://github.com/sindresorhus/p-debounce
function debounce(fn, wait) {
    let timer;
    let resolveList = [];
    return function(...arguments_) {
        return new Promise(resolve => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                const result = fn.apply(this, arguments_);
                for (resolve of resolveList) {
                    resolve(result);
                }
                resolveList = [];
            }, wait);
            resolveList.push(resolve);
        });
    }
}