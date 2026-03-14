$(function () {
    $('.nav-btn').on('click', function () {
        $(this).toggleClass('open');
    });
});

$(document).ready(function () {
    $(window).scroll(function () {
        var scroll = $(window).scrollTop();
        if (scroll > 100) {
            $("#header").addClass('glass-effect');
        } else {
            $("#header").removeClass("glass-effect");
        }
    });

    $(".tab").click(function () {
        let tabs = $(this).closest('.tabs');
        let tabContent = tabs.siblings('.tab-content');
        let backgroundContainer = tabs.siblings('.background-container');
    
        // Hapus kelas "active" dari semua tab dan tambahkan ke tab yang diklik
        tabs.find('.tab').removeClass('active');
        $(this).addClass("active");
    
        // Sembunyikan semua konten dan tampilkan yang sesuai dengan tab yang diklik
        let selectedTab = $(this).data("tab");
        tabContent.find(".content").removeClass("active");
        tabContent.find("#" + selectedTab).addClass("active");
    
        // Jika ada background-container, perbarui gambar sesuai dengan tab yang aktif
        if (backgroundContainer.length) {
            let bgImage = backgroundContainer.find(".bg-images img#" + selectedTab).attr("src");
            if (bgImage) {
                backgroundContainer.css("background-image", `url(${bgImage})`);
            }
        }
    });
    
    
    $('.marquee-container').each(function () {
        const cont = $(this); // Mengambil marquee-container saat ini
        const content = cont.find('.marquee-content');
        const clone = content.clone();
        const clone2 = clone.clone();
        cont.append(clone);
        cont.append(clone2); // Clone hanya untuk container ini

        cont.find('.marquee-content').addClass('marquee'); // Tambahkan class marquee pada konten yang di-clone
    });

    const tabCourse = $('#course-tab');
    const tabDuration = $('#tab-duration');
    
    let courseActive = tabCourse.find('.tab.active');
    let dataCourseActive = courseActive.data('course');
    
    let durationActive = tabDuration.find('.tab.active');
    let dataDurationActive = durationActive.data('duration');    
    
    filterClasses(dataCourseActive);
    filterDuration(dataDurationActive);

    tabCourse.find('.tab').on('click' , function(e){
        e.preventDefault();
        let course = $(this).data('course');
        filterClasses(course);
        $(this).addClass('active');
        $(this).siblings().removeClass('active');
    });

    tabDuration.find('.tab').on('click' , function(e){
        e.preventDefault();
        let duration = $(this).data('duration');
        filterDuration(duration);
        $(this).addClass('active');
        $(this).siblings().removeClass('active');
    });

    function filterClasses(course) {    
        if (course === 'all') {
            $('.class-course').addClass('active');
        } else {
            $('.class-course').each(function() {
                const courses = $(this).attr('data-courses') || '';
                if (courses.includes(course)) {
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
                }
            });
        }
    }
    
    function filterDuration(duration) {
        if (duration === 'all') {
            $('.class-duration').addClass('active');
        } else {
            $('.class-duration').each(function() {
                const durations = $(this).attr('data-duration') || '';
                if (durations.includes(duration)) {
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
                }
            });
        }
    }
});


function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function animateNumber(element, targetNumber, duration) {
    const startTime = performance.now();
    const startNumber = 0;

    function updateNumber(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const currentNumber = Math.floor(startNumber + progress * (targetNumber - startNumber));

        element.textContent = currentNumber;

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = targetNumber;
        }
    }

    requestAnimationFrame(updateNumber);
}

function checkScroll() {
    const numberElements = document.querySelectorAll('.number');
    
    numberElements.forEach(element => {
        if (!element.classList.contains('animated')) {
            const targetValue = parseInt(element.getAttribute("data-target"), 10);
            const durationValue = parseInt(element.getAttribute("data-duration"), 10);

            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            
            if (rect.top <= windowHeight && rect.bottom >= 0) {
                animateNumber(element, targetValue, durationValue);
                element.classList.add('animated');
            }
        }
    });
}

window.addEventListener('scroll', checkScroll);
window.addEventListener('load', function() {
    setTimeout(checkScroll, 100);
});
document.addEventListener('DOMContentLoaded', function() {
    checkScroll();
});


$(document).ready(function () {
  $('.hotspot').on('click', function () {
      alert($(this).attr('data-text'));
  });
});

$(document).ready(function () {
  $('.blob').each(function () {
      let randomDelay = Math.random() * 6; // Delay acak antara 0 - 5 detik
      $(this).css('animation-delay', randomDelay + 's');
  });
});






