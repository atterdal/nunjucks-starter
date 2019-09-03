// Defining requirements
var gulp = require('gulp');
var plumber = require('gulp-plumber');
var sass = require('gulp-sass');
var babel = require('gulp-babel');
var postcss = require('gulp-postcss');
var watch = require('gulp-watch');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var ignore = require('gulp-ignore');
var rimraf = require('gulp-rimraf');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var del = require('del');
var cleanCSS = require('gulp-clean-css');
var gulpSequence = require('gulp-sequence');
var replace = require('gulp-replace');
var autoprefixer = require('autoprefixer');

var data = require('gulp-data');
var nunjucksRender = require('gulp-nunjucks-render');

// Configuration file to keep your code DRY
var cfg = require('./gulpconfig.json');
var paths = cfg.paths;

// Run:
// gulp sass
// Compiles SCSS files in CSS
gulp.task('sass', function() {
	var stream = gulp
		.src(paths.sass + '/*.scss')
		.pipe(
			plumber({
				errorHandler: function(err) {
					console.log(err);
					this.emit('end');
				}
			})
		)
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sass({ errLogToConsole: true }))
		.pipe(postcss([autoprefixer()]))
		.pipe(sourcemaps.write(undefined, { sourceRoot: null }))
		.pipe(gulp.dest(paths.css));
	return stream;
});

// Run:
// gulp watch
// Starts watcher. Watcher runs gulp sass task on changes
gulp.task('watch', function() {
	gulp.watch(`${paths.sass}/**/*.scss`, gulp.series('styles'));
	gulp.watch(
		[
			`${paths.dev}/assets/js/**/*.js`,
			`${paths.js}/**/*.js`,
			`!${paths.js}/app.js`,
			`!${paths.js}/app.min.js`
		],
		gulp.series('scripts')
	);

	gulp.watch(`src/**/*.njk`, gulp.series('nunjucks'));

	//Inside the watch task.
	gulp.watch(`${paths.imgsrc}/**`, gulp.series('imagemin-watch'));
});

// Run:
// gulp imagemin
// Running image optimizing task
gulp.task('imagemin', function() {
	gulp
		.src(`${paths.imgsrc}/**`)
		.pipe(imagemin())
		.pipe(gulp.dest(paths.img));
});

/**
 * Ensures the 'imagemin' task is complete before reloading browsers
 * @verbose
 */
gulp.task(
	'imagemin-watch',
	gulp.series('imagemin', function() {
		browserSync.reload({stream: true});
	})
);

// Run:
// gulp cssnano
// Minifies CSS files
gulp.task('cssnano', function() {
	return gulp
		.src(paths.css + '/styles.css')
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(
			plumber({
				errorHandler: function(err) {
					console.log(err);
					this.emit('end');
				}
			})
		)
		.pipe(rename({ suffix: '.min' }))
		.pipe(cssnano({ discardComments: { removeAll: true } }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(paths.css));
});

gulp.task('minifycss', function() {
	return gulp
		.src(`${paths.css}/styles.css`)
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(cleanCSS({ compatibility: '*' }))
		.pipe(
			plumber({
				errorHandler: function(err) {
					console.log(err);
					this.emit('end');
				}
			})
		)
		.pipe(rename({ suffix: '.min' }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(paths.css));
});

gulp.task('cleancss', function() {
	return gulp
		.src(`${paths.css}/*.min.css`, { read: false }) // Much faster
		.pipe(ignore('styles.css'))
		.pipe(rimraf());
});

gulp.task('styles', function(callback) {
	gulp.series('sass', 'minifycss')(callback);
});

// Run:
// gulp browser-sync
// Starts browser-sync task for starting the server.
gulp.task('browser-sync', function() {
	browserSync.init(cfg.browserSyncWatchFiles, cfg.browserSyncOptions);
});

// Nunjucks HTML Templating
gulp.task('nunjucks', function () {
	// Gets .html and .njk files in pages folder...
	return gulp.src('src/pages/**/*.+(html|njk)')
		.pipe(data(function () { return require('./src/data.json'); }))
	  // Renders template folder with nunjucks...
	  .pipe(nunjucksRender({
		path: ['src/templates']
	  }))
	  // output files in src folder
	  .pipe(gulp.dest('./'))
  });

// Run:
// gulp scripts.
// Uglifies and concat all JS files into one
gulp.task('scripts', function() {
	var scripts = [
		// Start - All BS4 stuff
        
        `${paths.node}/jquery/dist/jquery.js`,
        `${paths.node}/popper.js/dist/umd/popper.js`,
        `${paths.node}/bootstrap/dist/js/bootstrap.js`,

		// End - All BS4 stuff

		// Adding currently empty javascript file to add on for your own themes´ customizations
		// Please add any customizations to this .js file only!
		`./src/assets/js/scripts.js`
	];
	gulp
		.src(scripts, { allowEmpty: true })
		.pipe(babel(
			{
				presets: ['@babel/preset-env']
			}
		))
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest(paths.js));

	return gulp
		.src(scripts, { allowEmpty: true })
		.pipe(babel())
		.pipe(concat('app.js'))
		.pipe(gulp.dest(paths.js))
        .pipe(browserSync.stream());
});

// Deleting any file inside the /src folder
gulp.task('clean-source', function() {
	return del(['src/**/*']);
});

// Run:
// gulp watch-bs
// Starts watcher with browser-sync. Browser-sync reloads page automatically on your browser
gulp.task('watch-bs', gulp.parallel('browser-sync', 'watch'));

// Deleting any file inside the /dist folder
gulp.task('clean-dist', function() {
	return del([paths.dist + '/**']);
});

// Run
// gulp dist
// Copies the files to the /dist folder for distribution as simple theme
gulp.task(
	'dist',
	gulp.series(['clean-dist'], function() {
		return gulp
			.src(
				[
					'**/*',
					`!${paths.bower}`,
					`!${paths.bower}/**`,
					`!${paths.node}`,
					`!${paths.node}/**`,
					`!${paths.dev}`,
					`!${paths.dev}/**`,
					`!${paths.dist}`,
					`!${paths.dist}/**`,
					`!${paths.distprod}`,
					`!${paths.distprod}/**`,
					`!${paths.sass}`,
					`!${paths.sass}/**`,
					'!readme.txt',
					'!readme.md',
					'!package.json',
					'!package-lock.json',
					'!gulpfile.js',
					'!gulpconfig.json',
					'!CHANGELOG.md',
					'!.travis.yml',
					'!jshintignore',
					'!codesniffer.ruleset.xml',
					'*'
				],
				{ buffer: true }
			)
			.pipe(
				replace(
					'/js/jquery.slim.min.js',
					'/js' + paths.vendor + '/jquery.slim.min.js',
					{ skipBinary: true }
				)
			)
			.pipe(
				replace('/js/popper.min.js', '/js' + paths.vendor + '/popper.min.js', {
					skipBinary: true
				})
			)
			.pipe(
				replace(
					'/js/skip-link-focus-fix.js',
					'/js' + paths.vendor + '/skip-link-focus-fix.js',
					{ skipBinary: true }
				)
			)
			.pipe(gulp.dest(paths.dist));
	})
);

// Deleting any file inside the /dist-product folder
gulp.task('clean-dist-product', function() {
	return del([paths.distprod + '/**']);
});

// Run
// gulp dist-product
// Copies the files to the /dist-prod folder for distribution as theme with all assets
gulp.task(
	'dist-product',
	gulp.series(['clean-dist-product'], function() {
		return gulp
			.src([
				'**/*',
				`!${paths.bower}`,
				`!${paths.bower}/**`,
				`!${paths.node}`,
				`!${paths.node}/**`,
				`!${paths.dist}`,
				`!${paths.dist}/**`,
				`!${paths.distprod}`,
				`!${paths.distprod}/**`,
				'*'
			])
			.pipe(gulp.dest(paths.distprod));
	})
);

// Run
// gulp compile
// Compiles the styles and scripts and runs the dist task
gulp.task('compile', gulp.series('styles', 'scripts', 'dist'));

// Run:
// gulp
// Starts watcher (default task)
gulp.task('default', gulp.series('watch'));
