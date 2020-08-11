new Vue({
    el: "#app",
    data: {
        url: "",
        keyword: "",
        size: localStorage.getItem("size") !== null ? Number(localStorage.getItem("size")) : 10,
        expand: false,
        info: "Masukkan URL video",
        result: {
            data: [],
            page: null,
            isLast: null
        }
    },
    watch: {
        inputChange: debounce(async function() {
            this.result = {
                data: [],
                page: null,
                isLast: null
            };
            if (this.url === "") return this.info = "Masukkan URL video";
            if (!this.videoId) return this.info = "Format URL salah";
            if (this.size < 5 || this.size > 500) return this.info = "Masukkan angka dengan range 5 - 500";
            localStorage.setItem("size", this.size);
            if (this.keyword) {
                if (this.keyword.length >= 3) {
                    await this.load();
                } else {
                    this.info = "Kata kunci minimal 3 karakter";
                }
            } else {
                this.info = "Masukkan kata kunci yang ingin dicari";
            }
        }, 500)
    },
    computed: {
        inputChange: function() {
            return [this.url, this.keyword, this.size];
        },
        videoId: function() {
            if (this.url === "") return false;
            let url = this.url.search(/^https?:\/\//) !== -1 ? this.url : `http://${this.url}`;
            let params = new URL(url).searchParams;
            if (!params.has("v")) return false;
            return params.get("v");
        }
    },
    methods: {
        async load() {
            this.info = "...";
            const pageToLoad = this.result.page + 1;
            const videoUrl = encodeURIComponent("https://www.youtube.com/watch?v=" + this.videoId);
            const respond = await fetch(
                `https://cari-teks-video-api.vercel.app/api/search?q=${this.keyword}&url=${videoUrl}&page=${pageToLoad}&size=${this.size}`
            ).then((res) => (res.ok ? res.json() : []));

            const total = respond.total;
            if (total > 0) {
                this.info = `Menampilkan ${Math.min(pageToLoad * this.size, total)} dari ${total} hasil ditemukan`;
                this.result.data = this.result.data.concat(respond.data);
                this.result.page = respond.page;
                this.result.isLast = !respond.next;
            } else {
                this.info = `Tidak menemukan hasil dengan kata kunci "${this.keyword}"`;
            }
        },
        formatTime(seconds) {
            const milliseconds = seconds * 1000;
            let result = new Date(milliseconds).toISOString().substr(11, 8);
            if (result.startsWith("00")) {
                result = result.substr(3);
            }
            return result.startsWith("0") ? result.substr(1) : result;
        }
    }
});

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