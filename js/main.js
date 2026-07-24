/* ============================================
   КЕДР Glamping — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initSmoothScroll();
    initRevealAnimations();
    initFAQ();
    initGalleryLightbox();
    loadRooms();
    loadReviews();
    initReviewsNavigation();
    initBookingForm();
    initCertificateForm();
    initPhoneMasks();
    initGSAPAnimations();
});

/* ---- Toast Notifications ---- */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/* ---- Header Scroll Effect ---- */
let scrollPosition = 0;

function lockScroll() {
    scrollPosition = window.scrollY;
    document.body.classList.add('no-scroll');
    document.body.style.top = `-${scrollPosition}px`;
}

function unlockScroll() {
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
}

function initHeader() {
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

/* ---- Mobile Menu ---- */
function initMobileMenu() {
    const burger = document.getElementById('burgerBtn');
    const nav = document.getElementById('mainNav');

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('mobile-open');
        if (nav.classList.contains('mobile-open')) {
            lockScroll();
        } else {
            unlockScroll();
        }
    });

    // Close mobile menu on nav link click (including CTA)
    nav.querySelectorAll('.header__nav-link, .header__mobile-cta').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('mobile-open');
            unlockScroll();
        });
    });

    document.addEventListener('click', (e) => {
        if (nav.classList.contains('mobile-open') &&
            !nav.contains(e.target) &&
            !burger.contains(e.target)) {
            burger.classList.remove('active');
            nav.classList.remove('mobile-open');
            unlockScroll();
        }
    });
}

/* ---- Smooth Scroll ---- */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });
}

/* ---- Intersection Observer for Reveals ---- */
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ---- GSAP ScrollTrigger Animations ---- */
function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero title animation
    gsap.from('.hero__title', {
        opacity: 0, y: 60, duration: 1.2, ease: 'power3.out', delay: 0.3
    });
    gsap.from('.hero__subtitle', {
        opacity: 0, y: 40, duration: 1, ease: 'power3.out', delay: 0.6
    });
    gsap.from('.hero__buttons', {
        opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', delay: 0.9
    });

    // Stat counter animation
    const statNumbers = document.querySelectorAll('.about__stat-number');
    statNumbers.forEach(num => {
        const target = parseFloat(num.dataset.target);
        const isFloat = target % 1 !== 0;
        ScrollTrigger.create({
            trigger: num,
            start: 'top 85%',
            once: true,
            onEnter: () => {
                gsap.to(num, {
                    duration: 2,
                    ease: 'power2.out',
                    onUpdate: function () {
                        const progress = this.progress();
                        const current = target * progress;
                        num.textContent = isFloat ? current.toFixed(1) : Math.round(current);
                    }
                });
            }
        });
    });

}

/* ---- Rooms ---- */
const fallbackRooms = [
    {
        id: 1,
        name: 'Глэмпинг VETKA дом Барнхаус',
        type: 'house',
        short_description: 'Домик в сосновом бору с панорамным видом, проектором и мангалом',
        price_weekday: 9000,
        price_weekend: 12000,
        max_guests: 4,
        area: 45,
        image_url: 'Vetka_files/XXL(10)'
    },
    {
        id: 2,
        name: 'Купольный шатёр VETKA «Панорама»',
        type: 'dome',
        short_description: 'Романтический купол с прозрачным потолком и видом на звёзды',
        price_weekday: 7500,
        price_weekend: 10000,
        max_guests: 2,
        area: 32,
        image_url: 'Vetka_files/XXL(9)'
    },
    {
        id: 3,
        name: 'А-Фрейм домик «Лесной»',
        type: 'aframe',
        short_description: 'Скандинавский А-фрейм домик среди сосен с панорамными окнами',
        price_weekday: 6500,
        price_weekend: 9500,
        max_guests: 3,
        area: 30,
        image_url: 'glamp_files/cz5FUykCc5Q.jpg'
    },
    {
        id: 4,
        name: 'Кедровая баня-бочка',
        type: 'barrel',
        short_description: 'Кедровая баня-бочка с панорамной парилкой и банным сетом',
        price_weekday: 2000,
        price_weekend: 3000,
        max_guests: 6,
        area: 20,
        image_url: 'Vetka_files/XXL(1)'
    },
    {
        id: 5,
        name: 'Аренда Сибирского Чана',
        type: 'barrel',
        short_description: 'Горячий чан под открытым небом с пихтовыми ветками и цитрусами',
        price_weekday: 4000,
        price_weekend: 5000,
        max_guests: 6,
        area: 15,
        image_url: 'Vetka_files/XXL(7)'
    },
    {
        id: 6,
        name: 'Детская игровая зона',
        type: 'tent',
        short_description: 'Игровой городок с качелями и горками для маленьких гостей',
        price_weekday: 1000,
        price_weekend: 1500,
        max_guests: 4,
        area: 25,
        image_url: 'Vetka_files/XXL'
    }
];

let allRooms = fallbackRooms;

async function loadRooms() {
    renderRooms(allRooms);
    populateRoomSelect(allRooms);
    initRoomFilters();

    try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
            const data = await res.json();
            const rooms = data.data || data;
            if (rooms && rooms.length > 0) {
                allRooms = rooms;
                renderRooms(allRooms);
                populateRoomSelect(allRooms);
            }
        }
    } catch (err) {
        // Fallback room data will be used
    }
}

function renderRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    const typeLabels = { house: 'Дом Барнхаус', dome: 'Купольный шатёр', aframe: 'А-фрейм', tent: 'Детская площадка', barrel: 'Баня / Чан' };

    grid.innerHTML = rooms.map(room => `
        <div class="room-card" data-type="${escapeHtml(room.type)}" data-room-id="${room.id}" onclick="openRoomModal(${room.id})">
            <div class="room-card__image">
                <img src="${escapeHtml(room.image_url)}" alt="${escapeHtml(room.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="room-card__badge" data-type="${escapeHtml(room.type)}">${escapeHtml(typeLabels[room.type] || room.type)}</div>
            </div>
            <div class="room-card__body">
                <h3 class="room-card__name">${escapeHtml(room.name)}</h3>
                <p class="room-card__desc">${escapeHtml(room.short_description || room.description)}</p>
                <div class="room-card__meta">
                    <span>📐 ${room.area} м²</span>
                    <span>👤 до ${room.max_guests} гостей</span>
                </div>
                <div class="room-card__footer">
                    <div class="room-card__price">от ${room.price_weekday.toLocaleString('ru-RU')} ₽ <span>/ ночь</span></div>
                    <button class="btn btn--outline room-card__btn" onclick="event.stopPropagation(); openRoomModal(${room.id})">Подробнее</button>
                </div>
            </div>
        </div>
    `).join('');

    if (window.gsap) {
        gsap.fromTo('#roomsGrid .room-card', 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', clearProps: 'all' }
        );
    }
}

function initRoomFilters() {
    const filterBtns = document.querySelectorAll('.rooms__filter');
    filterBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            const filtered = filter === 'all' ? allRooms : allRooms.filter(r => r.type === filter);
            renderRooms(filtered);
        };
    });
}

/* ---- Room Modal ---- */
async function openRoomModal(roomId) {
    try {
        let room = allRooms.find(r => Number(r.id) === Number(roomId));
        if (!room) {
            const res = await fetch(`/api/rooms/${roomId}`);
            if (res.ok) room = await res.json();
        }
        if (!room) room = fallbackRooms.find(r => Number(r.id) === Number(roomId)) || fallbackRooms[0];

        let amenities = [];
        try { 
            amenities = typeof room.amenities === 'string' ? JSON.parse(room.amenities) : (room.amenities || []); 
        } catch (e) { 
            amenities = []; 
        }

        const body = document.getElementById('roomModalBody');
        body.innerHTML = `
            <div class="room-modal__image">
                <img src="${escapeHtml(room.image_url)}" alt="${escapeHtml(room.name)}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="room-modal__content">
                <h2 class="room-modal__title">${escapeHtml(room.name)}</h2>
                <div class="room-modal__meta">
                    <span>📐 ${room.area} м²</span>
                    <span>👤 до ${room.max_guests} гостей</span>
                </div>
                <p class="room-modal__desc">${escapeHtml(room.description || room.short_description)}</p>
                <h4 class="room-modal__amenities-title">Удобства</h4>
                <div class="room-modal__amenities">
                    ${(amenities || []).map(a => `<span class="room-modal__amenity">${escapeHtml(a)}</span>`).join('')}
                </div>
                <div class="room-modal__prices">
                    <div class="room-modal__price-item">
                        <label>Будни</label>
                        <span>${room.price_weekday.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div class="room-modal__price-item">
                        <label>Выходные</label>
                        <span>${room.price_weekend.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>
                <button class="btn btn--accent btn--lg btn--full" onclick="selectRoomForBooking(${room.id})">Забронировать этот домик</button>
            </div>
        `;

        openModal('roomModal');
    } catch (err) {
        showToast('Не удалось загрузить информацию', 'error');
    }
}

function selectRoomForBooking(roomId) {
    closeModal('roomModal');
    const select = document.getElementById('bookingRoom');
    select.value = roomId;
    select.dispatchEvent(new Event('change'));
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openActivityModal(key) {
    const activitiesData = {
        chan: {
            title: 'Горячие чаны на дровах',
            image: 'Vetka_files/XXL(7)',
            desc: 'Настоящий Сибирский банный чан под открытым небом с подогревом на берёзовых дровах. В воду добавляются свежие пихтовые веточки, дольки грейпфрута и апельсинов. Идеальная релаксация и восстановление сил в любую погоду!',
            details: ['Вместимость до 6 человек', 'Температура воды 38-42°C', 'Пихтово-цитрусовое наполнение', 'Подсветка в вечернее время'],
            price: '4 000 ₽ / 2 часа',
            roomId: 5
        },
        banya: {
            title: 'Кедровая баня-бочка',
            image: 'Vetka_files/XXL(1)',
            desc: 'Панорамная парная из алтайского кедра с видом на сосновый бор. Натуральный аромапар, берёзовые и дубовые веники, целебный банный сет и травяной чай с мёдом.',
            details: ['Просторная парилка на 6 гостей', 'Панорамное окно в лес', 'Дубовые и берёзовые веники', 'Чайный сет и халаты в комплекте'],
            price: '2 000 ₽ / час',
            roomId: 4
        },
        lake: {
            title: 'Озеро и рыбалка',
            image: 'Vetka_files/XXL(8)',
            desc: 'Всего в нескольких шагах от глэмпинга расположено живописное чистое озеро, окруженное лесом. У администратора можно арендовать удочки, снасти и лодку для тихой рыбалки или вечерних прогулок по воде.',
            details: ['Живописный водоём в 2 мин', 'Прокат удочек и снастей', 'Места для отдыха у воды', 'Карась, окунь, карп'],
            price: 'Включено в проживание'
        },
        walks: {
            title: 'Пешие прогулки и лесные тропы',
            image: 'Vetka_files/XXL(10)',
            desc: 'Экологически чистый вековой сосновый бор. Оборудованные прогулочные тропы, свежий фитонцидный воздух, тишина и возможность собирать целебные ягоды и грибы.',
            details: ['Чистейший сосновый воздух', 'Маршруты разной сложности', 'Сбор ягод и грибов', 'Аптечка и карты у администратора'],
            price: 'Бесплатно'
        },
        stars: {
            title: 'Звёздные вечера у костра',
            image: 'Vetka_files/XXL(9)',
            desc: 'Атмосферное костровище с удобными креслами-шезлонгами. Качественные теплые пледы, акустическая гитара, возможность поджарить маршмеллоу на костре и наблюдать за млечным путём через проектор или телескоп.',
            details: ['Костровая зона с креслами', 'Теплые пледы и маршмеллоу', 'Проектор для кино под звёздами', 'Тишина и звёздное небо'],
            price: 'Включено в проживание'
        },
        bbq: {
            title: 'Мангальные зоны у каждого домика',
            image: 'glamp_files/cz5FUykCc5Q.jpg',
            desc: 'У каждого домика VETKA обустроена собственная индивидуальная мангальная зона. В стоимость проживания уже включён полный комплект для барбекю: решётки, шампуры, розжиг и углы.',
            details: ['Собственный мангал у каждого домика', 'Шампуры и решётки-гриль', 'Мешок угля и розжиг включены', 'Освещение мангальной зоны'],
            price: 'Включено в проживание'
        }
    };

    const item = activitiesData[key];
    if (!item) return;

    const body = document.getElementById('roomModalBody');
    body.innerHTML = `
        <div class="room-modal__image">
            <img src="${item.image}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="room-modal__content">
            <h2 class="room-modal__title">${item.title}</h2>
            <p class="room-modal__desc" style="margin-top:12px;">${item.desc}</p>
            <h4 class="room-modal__amenities-title" style="margin-top:16px;">В программу входит:</h4>
            <div class="room-modal__amenities">
                ${item.details.map(d => `<span class="room-modal__amenity">✓ ${d}</span>`).join('')}
            </div>
            <div class="room-modal__prices" style="margin-top:20px;">
                <div class="room-modal__price-item">
                    <label>Стоимость</label>
                    <span style="color:var(--color-accent); font-size:1.3rem;">${item.price}</span>
                </div>
            </div>
            ${item.roomId ? 
                `<button class="btn btn--accent btn--lg btn--full" style="margin-top:20px;" onclick="selectRoomForBooking(${item.roomId})">Забронировать эту услугу</button>` :
                `<a href="https://t.me/VETKAGLAMP" target="_blank" class="btn btn--accent btn--lg btn--full" style="margin-top:20px; text-decoration:none;">Узнать у администратора</a>`
            }
        </div>
    `;

    openModal('roomModal');
}

/* ---- Modal Helpers ---- */
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    lockScroll();

    const backdrop = modal.querySelector('.modal__backdrop');
    if (backdrop) backdrop.onclick = () => closeModal(id);

    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.onclick = () => closeModal(id);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    unlockScroll();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(m => {
            m.classList.remove('open');
        });
        const lb = document.getElementById('lightbox');
        if (lb.classList.contains('open')) lb.classList.remove('open');
        unlockScroll();
    }
});

/* ---- Booking Form ---- */
function populateRoomSelect(rooms) {
    const select = document.getElementById('bookingRoom');
    // Clear existing options except the default placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }
    rooms.forEach(room => {
        const opt = document.createElement('option');
        opt.value = room.id;
        opt.textContent = `${room.name} — от ${room.price_weekday.toLocaleString('ru-RU')} ₽/ночь`;
        select.appendChild(opt);
    });
}

function initBookingForm() {
    const form = document.getElementById('bookingForm');
    const checkIn = document.getElementById('bookingCheckIn');
    const checkOut = document.getElementById('bookingCheckOut');
    const roomSelect = document.getElementById('bookingRoom');

    // Set min dates
    const today = new Date().toISOString().split('T')[0];
    checkIn.min = today;
    checkIn.value = '';
    checkOut.value = '';

    checkIn.addEventListener('change', () => {
        const nextDay = new Date(checkIn.value);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOut.min = nextDay.toISOString().split('T')[0];
        if (checkOut.value && checkOut.value <= checkIn.value) {
            checkOut.value = checkOut.min;
        }
        calculatePrice();
    });

    checkOut.addEventListener('change', calculatePrice);
    roomSelect.addEventListener('change', calculatePrice);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomId = roomSelect.value;
        const ciVal = checkIn.value;
        const coVal = checkOut.value;
        const guests = document.getElementById('bookingGuests').value;
        const name = document.getElementById('bookingName').value.trim();
        const email = document.getElementById('bookingEmail').value.trim();
        const phone = document.getElementById('bookingPhone').value.trim();
        const comment = document.getElementById('bookingComment').value.trim();

        if (!roomId || !ciVal || !coVal || !name || !email || !phone) {
            showToast('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        try {
            const certCode = document.getElementById('bookingCert').value.trim();
            const payload = {
                room_id: parseInt(roomId),
                check_in: ciVal,
                check_out: coVal,
                guests_count: parseInt(guests),
                guest_name: name,
                guest_email: email,
                guest_phone: phone,
                comment: comment || undefined
            };
            if (certCode) payload.certificate_code = certCode;

            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Ошибка при бронировании', 'error');
                return;
            }

            document.getElementById('bookingCode').textContent = data.booking_code;
            openModal('bookingSuccessModal');
            form.reset();
            document.getElementById('priceDisplay').style.display = 'none';
        } catch (err) {
            showToast('Ошибка сети. Попробуйте позже', 'error');
        }
    });
}

async function calculatePrice() {
    const roomId = document.getElementById('bookingRoom').value;
    const checkIn = document.getElementById('bookingCheckIn').value;
    const checkOut = document.getElementById('bookingCheckOut').value;
    const priceDisplay = document.getElementById('priceDisplay');
    const priceValue = document.getElementById('priceValue');

    if (!roomId || !checkIn || !checkOut) {
        priceDisplay.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`/api/rooms/${roomId}/availability?check_in=${checkIn}&check_out=${checkOut}`);
        const data = await res.json();

        if (data.available) {
            let finalPrice = data.price_total;
            
            // Check if cert is applied and valid
            const certCode = document.getElementById('bookingCert').value.trim().toUpperCase();
            if (certCode && document.getElementById('certResult').textContent.includes('применён')) {
                // We need to fetch the cert amount again or parse it from text. Better yet, we can fetch it.
                try {
                    const certRes = await fetch(`/api/certificates/${certCode}`);
                    const certData = await certRes.json();
                    if (certData.success && !certData.data.is_used) {
                        finalPrice = Math.max(0, finalPrice - certData.data.amount);
                    }
                } catch (e) {}
            }

            priceValue.textContent = `${finalPrice.toLocaleString('ru-RU')} ₽`;
            priceDisplay.style.display = 'flex';
        } else {
            priceValue.textContent = 'Даты заняты';
            priceDisplay.style.display = 'flex';
        }
    } catch (err) {
        priceDisplay.style.display = 'none';
    }
}

async function applyCertificate() {
    const code = document.getElementById('bookingCert').value.trim().toUpperCase();
    const resultEl = document.getElementById('certResult');
    const applyBtn = document.getElementById('applyCertBtn');
    
    if (!code) {
        resultEl.textContent = 'Введите код сертификата';
        resultEl.style.color = 'var(--color-error, #c85c5c)';
        resultEl.style.display = 'block';
        return;
    }

    applyBtn.disabled = true;
    applyBtn.textContent = '...';

    try {
        const res = await fetch(`/api/certificates/${code}`);
        const data = await res.json();

        if (data.success) {
            const cert = data.data;
            if (cert.is_used) {
                resultEl.textContent = 'Этот сертификат уже использован';
                resultEl.style.color = 'var(--color-error, #c85c5c)';
            } else if (cert.expires_at && new Date(cert.expires_at) < new Date()) {
                resultEl.textContent = 'Срок действия сертификата истек';
                resultEl.style.color = 'var(--color-error, #c85c5c)';
            } else {
                resultEl.textContent = `Сертификат на ${cert.amount.toLocaleString('ru-RU')} ₽ применён!`;
                resultEl.style.color = 'var(--color-success, #2d7a50)';
                // Recalculate price if dates are selected
                calculatePrice();
            }
        } else {
            resultEl.textContent = data.error || 'Сертификат не найден';
            resultEl.style.color = 'var(--color-error, #c85c5c)';
        }
        resultEl.style.display = 'block';
    } catch (err) {
        resultEl.textContent = 'Ошибка сети';
        resultEl.style.color = 'var(--color-error, #c85c5c)';
        resultEl.style.display = 'block';
    } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Применить';
    }
}

/* ---- Phone Mask ---- */
function initPhoneMasks() {
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', function (e) {
            let value = this.value.replace(/\D/g, '');
            if (value.length === 0) { this.value = ''; return; }
            if (value[0] === '8') value = '7' + value.slice(1);
            if (value[0] !== '7') value = '7' + value;

            let formatted = '+7';
            if (value.length > 1) formatted += ' (' + value.slice(1, 4);
            if (value.length > 4) formatted += ') ' + value.slice(4, 7);
            if (value.length > 7) formatted += '-' + value.slice(7, 9);
            if (value.length > 9) formatted += '-' + value.slice(9, 11);
            this.value = formatted;
        });
    });
}

/* ---- Gift Certificates ---- */
function initCertificateForm() {
    const amounts = document.querySelectorAll('.cert-amount');
    const customInput = document.getElementById('certCustomAmount');
    const hiddenAmount = document.getElementById('certAmount');

    amounts.forEach(btn => {
        btn.addEventListener('click', () => {
            amounts.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.amount === 'custom') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                hiddenAmount.value = btn.dataset.amount;
            }
        });
    });

    customInput.addEventListener('input', () => {
        hiddenAmount.value = customInput.value;
    });

    document.getElementById('certForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseInt(hiddenAmount.value);
        const name = document.getElementById('certName').value.trim();
        const email = document.getElementById('certEmail').value.trim();
        const phone = document.getElementById('certPhone').value.trim();
        const recipient = document.getElementById('certRecipient').value.trim();
        const message = document.getElementById('certMessage').value.trim();

        if (!amount || amount < 1000 || !name || !email || !phone) {
            showToast('Заполните все обязательные поля (минимум 1000 ₽)', 'error');
            return;
        }

        try {
            const res = await fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    purchaser_name: name,
                    purchaser_email: email,
                    purchaser_phone: phone,
                    recipient_name: recipient || undefined,
                    message: message || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Ошибка при создании сертификата', 'error');
                return;
            }

            showToast(`Сертификат создан! Код: ${data.code}`, 'success');
            document.getElementById('certForm').reset();
        } catch (err) {
            showToast('Ошибка сети. Попробуйте позже', 'error');
        }
    });
}

/* ---- Reviews ---- */
const fallbackReviews = [
    {
        id: 1,
        guest_name: 'Роман',
        rating: 5,
        text: 'Прекрасное место для отдыха от городской суеты! Отдыхали в Барнхаусе — чистота идеальная, в домике есть всё: от проектора до чая и специй. Очень тепло (тёплые полы), банный чан на дровах с пихтовыми ветками — это просто сказка! Обязательно вернёмся.',
        room_type: 'house',
        created_at: '2026-06-15'
    },
    {
        id: 2,
        guest_name: 'Ольга Х.',
        rating: 5,
        text: 'Волшебный купольный шатёр! Просыпаться с видом на сосновый бор через панорамный купол — непередаваемые ощущения. Отдельное спасибо за кедровую баню-бочку.',
        room_type: 'dome',
        created_at: '2026-06-02'
    },
    {
        id: 3,
        guest_name: 'Дилия Спиридонова',
        rating: 5,
        text: 'Уютный А-фрейм домик! Тихо, спокойно, кругом сосны. Ребёнок в восторге от игровой площадки. Огромное спасибо администраторам за тёплый приём!',
        room_type: 'aframe',
        created_at: '2026-05-20'
    },
    {
        id: 4,
        guest_name: 'Камилла Яруллина',
        rating: 5,
        text: 'Отмечали годовщину в VETKA. Сибирский чан с цитрусами под вечерним небом — лучшая SPA-процедура! В домике колонка Алиса, проектор и домашний уют.',
        room_type: 'barrel',
        created_at: '2026-05-10'
    },
    {
        id: 5,
        guest_name: 'Марина К.',
        rating: 5,
        text: 'Безупречный сервис! Все фото на 100% соответствуют реальности. Мангальная зона укомплектована углями и розжигом. 5 звезд из 5!',
        room_type: 'house',
        created_at: '2026-04-28'
    },
    {
        id: 6,
        guest_name: 'Гузель Н.',
        rating: 5,
        text: 'Тишина и свежий сосновый воздух в 40 минутах от Казани. Очень понравилась кедровая баня и веники. Рекомендую всем родным и друзьям!',
        room_type: 'barrel',
        created_at: '2026-04-12'
    }
];

async function loadReviews() {
    renderReviews(fallbackReviews);

    try {
        const res = await fetch('/api/reviews');
        if (res.ok) {
            const data = await res.json();
            const reviews = data.data || data;
            if (reviews && reviews.length > 0) {
                renderReviews(reviews);
            }
        }
    } catch (err) {
        // Fallback reviews will be used
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderReviews(reviews) {
    const carousel = document.getElementById('reviewsCarousel');
    if (!carousel) return;
    const typeLabels = { dome: 'Купольный шатёр', house: 'Дом Барнхаус', aframe: 'А-фрейм', barrel: 'Баня / Чан', tent: 'Детская площадка' };

    // Duplicate list for seamless infinite looping marquee
    const doubledReviews = [...reviews, ...reviews];

    carousel.innerHTML = doubledReviews.map(review => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const date = new Date(review.created_at).toLocaleDateString('ru-RU', {
            year: 'numeric', month: 'long'
        });
        return `
            <div class="review-card">
                <div class="review-card__header">
                    <span class="review-card__name">${escapeHtml(review.guest_name)}</span>
                    <span class="review-card__stars">${stars}</span>
                </div>
                <p class="review-card__text">${escapeHtml(review.text)}</p>
                <div class="review-card__meta">
                    ${review.room_type ? escapeHtml(typeLabels[review.room_type] || review.room_type) + ' · ' : ''}${date}
                </div>
            </div>
        `;
    }).join('');
}

function initReviewsNavigation() {
    const carousel = document.getElementById('reviewsCarousel');
    const prevBtn = document.getElementById('reviewsPrevBtn');
    const nextBtn = document.getElementById('reviewsNextBtn');

    if (!carousel || !prevBtn || !nextBtn) return;

    prevBtn.onclick = (e) => {
        e.preventDefault();
        carousel.scrollBy({ left: -380, behavior: 'smooth' });
    };

    nextBtn.onclick = (e) => {
        e.preventDefault();
        carousel.scrollBy({ left: 380, behavior: 'smooth' });
    };
}

/* ---- FAQ Accordion ---- */
function initFAQ() {
    document.querySelectorAll('.faq__question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq__item');
            const isActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq__item').forEach(i => i.classList.remove('active'));

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

/* ---- Gallery Lightbox ---- */
let currentLightboxIndex = 0;
let galleryItems = [];

function initGalleryLightbox() {
    galleryItems = Array.from(document.querySelectorAll('.gallery__item'));
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    const caption = document.getElementById('lightboxCaption');

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentLightboxIndex = index;
            showLightboxItem();
            lightbox.classList.add('open');
            lockScroll();
        });
    });

    document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    document.querySelector('.lightbox__prev').addEventListener('click', () => {
        currentLightboxIndex = (currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length;
        showLightboxItem();
    });
    document.querySelector('.lightbox__next').addEventListener('click', () => {
        currentLightboxIndex = (currentLightboxIndex + 1) % galleryItems.length;
        showLightboxItem();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}

function showLightboxItem() {
    const item = galleryItems[currentLightboxIndex];
    if (!item) return;
    const targetEl = item.querySelector('img') || item.querySelector('.gallery__placeholder');
    const captionText = item.dataset.caption || '';

    const content = document.getElementById('lightboxContent');
    const caption = document.getElementById('lightboxCaption');

    content.innerHTML = '';
    if (targetEl) {
        const clone = targetEl.cloneNode(true);
        clone.style.transform = 'none';
        clone.style.maxHeight = '80vh';
        clone.style.maxWidth = '90vw';
        clone.style.objectFit = 'contain';
        content.appendChild(clone);
    }
    caption.textContent = captionText;
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    unlockScroll();
}

/* ---- Booking Lookup ---- */
async function lookupBooking() {
    const codeInput = document.getElementById('lookupCode');
    const resultDiv = document.getElementById('lookupResult');
    const code = codeInput.value.trim().toUpperCase();

    if (!code) {
        showToast('Введите код бронирования', 'error');
        return;
    }

    try {
        const btn = document.getElementById('lookupBtn');
        btn.disabled = true;
        btn.textContent = 'Поиск...';

        const res = await fetch(`/api/bookings/${code}`);
        const data = await res.json();

        if (data.success) {
            const b = data.data;
            const statusLabels = { pending: 'Ожидает подтверждения', confirmed: 'Подтверждено', cancelled: 'Отменено' };
            const statusColors = { pending: '#d4a843', confirmed: '#2d7a50', cancelled: '#c85c5c' };
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(200,149,108,0.15);">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 10px;">${escapeHtml(b.room_name)}</div>
                    <div style="font-size: 0.9rem; margin-bottom: 5px;"><strong>Заезд:</strong> ${escapeHtml(b.check_in)} (с 15:00)</div>
                    <div style="font-size: 0.9rem; margin-bottom: 5px;"><strong>Выезд:</strong> ${escapeHtml(b.check_out)} (до 12:00)</div>
                    <div style="font-size: 0.9rem; margin-bottom: 5px;"><strong>Гостей:</strong> ${escapeHtml(b.guests_count)}</div>
                    <div style="font-size: 0.9rem; margin-bottom: 10px;"><strong>Сумма:</strong> ${b.total_price.toLocaleString('ru-RU')} ₽</div>
                    <div style="font-size: 0.9rem; color: ${statusColors[b.status]}"><strong>Статус:</strong> ${escapeHtml(statusLabels[b.status])}</div>
                    ${b.status !== 'cancelled' ? `<button class="btn btn--outline" style="margin-top:10px; width:100%; border-color:#c85c5c; color:#c85c5c" onclick="cancelBookingUser('${escapeHtml(b.booking_code)}')">Отменить бронирование</button>` : ''}
                </div>
            `;
        } else {
            showToast(data.error || 'Бронирование не найдено', 'error');
            resultDiv.style.display = 'none';
        }
    } catch (err) {
        showToast('Ошибка при поиске бронирования', 'error');
    } finally {
        const btn = document.getElementById('lookupBtn');
        btn.disabled = false;
        btn.textContent = 'Найти';
    }
}

async function cancelBookingUser(code) {
    if (!confirm('Вы уверены, что хотите отменить бронирование? Это действие необратимо.')) return;
    
    try {
        const res = await fetch(`/api/bookings/${code}/cancel`, { method: 'PATCH' });
        const data = await res.json();
        
        if (data.success) {
            showToast('Бронирование успешно отменено', 'success');
            lookupBooking(); // Refresh the lookup view
        } else {
            showToast(data.error || 'Не удалось отменить бронирование', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}
