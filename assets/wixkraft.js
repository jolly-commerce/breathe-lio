
const swiperCol = new Swiper(".new-home-banner-wrapper", {
  effect: "fade", 
  fadeEffect: {
    crossFade: true 
  },
  speed: 2000,
  slidesPerView: 1,
  spaceBetween: 0,
  grabCursor: true,
  freeMode: false,
  loop: true,
  mousewheel: false,
  keyboard: {
    enabled: true
  },
  autoplay: {
    delay: 5000,
    disableOnInteraction: false
  },
  pagination: {
    el: ".swiper-pagination-banner",
    clickable: true,
    renderBullet: function (index, className) {
      return '<span class="' + className + '">' + (index + 1) + "</span>";
    }
  },
  navigation: {
    nextEl: ".swiper-button-next-home-banner",
    prevEl: ".swiper-button-prev-home-banner"
  }
});



const swiperCol2 = new Swiper(".wrapper-review-slider", {
  speed: 1000,
  slidesPerView: 1,
  centeredSlides: true,
  spaceBetween: 10,
  grabCursor: true,
  freeMode: false,
  loop: false,
  mousewheel: false,
  keyboard: {
    enabled: true
  },
  autoplay: {
    delay: 5000, 
    disableOnInteraction: false 
  },
  scrollbar: {
    el: '.review-scrollbar',
    draggable: true,
  },
});
const swiperCol10 = new Swiper(".customer-review-slider", {
  speed: 1000,
  slidesPerView: 1,
  centeredSlides: true,
  spaceBetween: 10,
  grabCursor: true,
  freeMode: false,
  loop: false,
  mousewheel: false,
  keyboard: {
    enabled: true
  },
  scrollbar: {
    el: '.customer-scrollbar',
    draggable: true,
  },
});


const swiperCol3 = new Swiper(".join-bottom", {
  speed: 700,
  slidesPerView: 3.5,
  spaceBetween: 20,
  grabCursor: true,
  freeMode: true,
    mousewheel: { forceToAxis: true, invert: true },
  loop: false,
  keyboard: {
    enabled: true
  },
  scrollbar: {
    el: '.movement-scrollbar',
    draggable: true,
  },
   navigation: {
    nextEl: ".next-mov-1",
    prevEl: ".prev-mov-1"
  },
  breakpoints: {
    768: {
      slidesPerView: 1.3,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 2.5,
      spaceBetween: 20,
    }
  }
});


const swiperCol4 = new Swiper(".gb-center-inner", {
  speed: 1000,
  slidesPerView: 1,
  centeredSlides: true,
  spaceBetween: 10,
  grabCursor: true,
  freeMode: false,
  loop: false,
  mousewheel: false,
  keyboard: {
    enabled: true
  },
   navigation: {
    nextEl: ".next-gb-1",
    prevEl: ".prev-gb-1"
  },
});

document.addEventListener("DOMContentLoaded", () => {
    // count slides once
    const imgSlides = document.querySelectorAll(
      ".image-wrapper-full .swiper-slide"
    ).length;
    const txtSlides = document.querySelectorAll(
      ".text-wrapper-full .swiper-slide"
    ).length;

    // 1) Text slider
    const swiperText = new Swiper(".text-wrapper-full", {
      speed: 1000,
      slidesPerView: 1,
      spaceBetween: 20,
      loop: true,
       scrollbar: {
    el: '.experts-scrollbar',
    draggable: true,
  },
      loopAdditionalSlides: txtSlides,
      keyboard: { enabled: true },
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
    });

    // 2) Image slider
    const swiperImages = new Swiper(".image-wrapper-full", {
      speed: 700,
      slidesPerView: 4,
      spaceBetween: 20,
      loop: true,
      loopAdditionalSlides: imgSlides,
      grabCursor: true,
      keyboard: { enabled: true },
      navigation: {
        nextEl: ".next-image-1",
        prevEl: ".prev-image-1",
      },
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      breakpoints: {
        900: {
          slidesPerView: 3,
          spaceBetween: 10,
        },
      },
    });

    // 3) Link them
    swiperText.controller.control = swiperImages;
    swiperImages.controller.control = swiperText;
  });

const swiperCol7 = new Swiper(".swipe-icon", {
  speed: 700,
  slidesPerView: 1.3,
  spaceBetween: 30,
  grabCursor: true,
    mousewheel: { forceToAxis: true, invert: true },
  loop: false,
  keyboard: {
    enabled: true
  },
  scrollbar: {
    el: '.icon-scrollbar',
    draggable: true,
  }
});

const swiperColBen = new Swiper(".first-wrapper-slider", {
  speed: 1000,
  slidesPerView: 1,
  spaceBetween: 0,
  grabCursor: true,
  freeMode: false,
  loop: false,
  mousewheel: false,
  effect: "fade", // Use fade instead of slide
  fadeEffect: {
    crossFade: true // Smooth cross-fade between slides
  },
  keyboard: {
    enabled: true
  },
   navigation: {
    nextEl: ".next-ben-1",
    prevEl: ".prev-ben-1"
  }
});

const swiperColBen2 = new Swiper(".second-wrapper-slider", {
  speed: 1000,
  slidesPerView: 1,
  spaceBetween: 0,
  grabCursor: true,
  freeMode: false,
  loop: false,
  mousewheel: false,
  effect: "fade", // Use fade instead of slide
  fadeEffect: {
    crossFade: true // Smooth cross-fade between slides
  },
  keyboard: {
    enabled: true
  },
  navigation: {
    nextEl: ".next-ben-2",
    prevEl: ".prev-ben-2"
  }
});


 const videoSwiper = new Swiper('.mySwiper1', {
    slidesPerView: 'auto',
    spaceBetween: 30,
    loop: true,
    centeredSlides: true,
    keyboard: { enabled: true },
    navigation: {
      nextEl: ".swiper-button-next-ugc",
      prevEl: ".swiper-button-prev-ugc"
    },
    scrollbar: { el: ".swiper-scrollbar-ugc", draggable: true },
    breakpoints: {
      1024: {
        slidesPerView: 1.4,
        freeMode: false
      }
    }
  });



  (function() {
    // Helper: pad a number to two digits
    function twoDigits(num) {
      return num < 10 ? '0' + num : String(num);
    }

    // Compute milliseconds until next local midnight
    function msUntilNextMidnight() {
      const now = new Date();
      const tomorrowMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow's date
        0, 0, 0, 0         // 00:00:00.000 local
      );
      return tomorrowMidnight - now;
    }

    // Convert milliseconds to hours/minutes/seconds
    function breakdown(ms) {
      const totalSec = Math.floor(ms / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      return { hours: hrs, minutes: mins, seconds: secs };
    }

    // Build the inner HTML for one timer container (using classes, not IDs)
    function buildTimerFor(container) {
      container.innerHTML = `
        <div class="timer-segment">
          <span class="time-value hours-value">00</span>
          <span class="time-label">Hours</span>
        </div>
        <div class="timer-segment">
          <span class="time-value minutes-value">00</span>
          <span class="time-label">Min</span>
        </div>
        <div class="timer-segment">
          <span class="time-value seconds-value">00</span>
          <span class="time-label">Sec</span>
        </div>
      `;
    }

    document.addEventListener('DOMContentLoaded', function() {
      // 1) Find ALL .main-timer elements
      const allTimers = document.querySelectorAll('.main-timer');
      if (allTimers.length === 0) {
        console.warn('No element with class "main-timer" found on this page.');
        return;
      }

      // 2) For each container, build the markup and keep references to its spans
      const timers = []; // array of { hoursEl, minutesEl, secondsEl }

      allTimers.forEach(function(container) {
        // Insert the three "HH / Min / Sec" segments into this container
        buildTimerFor(container);

        // Grab that container's spans by class (within its own subtree)
        const hoursEl   = container.querySelector('.hours-value');
        const minutesEl = container.querySelector('.minutes-value');
        const secondsEl = container.querySelector('.seconds-value');

        // Save references so we can update them each second
        timers.push({ hoursEl, minutesEl, secondsEl });
      });

      // 3) A single function to update **all** timers
      function updateAllCountdowns() {
        // Compute how many ms remain until midnight (same for everyone)
        const msLeft = msUntilNextMidnight();
        const safeMs = msLeft > 0 ? msLeft : 0;
        const { hours, minutes, seconds } = breakdown(safeMs);

        // Format them once
        const hh = twoDigits(hours);
        const mm = twoDigits(minutes);
        const ss = twoDigits(seconds);

        // Write into every timer on the page
        timers.forEach(function(t) {
          t.hoursEl.textContent   = hh;
          t.minutesEl.textContent = mm;
          t.secondsEl.textContent = ss;
        });
      }

      // 4) Initial render
      updateAllCountdowns();

      // 5) Re-run every 1000ms (1 second)
      setInterval(updateAllCountdowns, 1000);
    });
  })();