const test = require('ava');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

const SnapPackager = require('./snap-packager');

const makeOptions = {
	appName: 'Nimble Notes v3!',
	forgeConfig: {
		packagerConfig: {
			icon: './test/fixtures/icon'
		}
	},
	packageJSON: {
		version: '2.0.3',
		description: 'Simple note taking'
		// Name = name
		// Product name = productName
		// Description = description
	},
	targetArch: 'x64',
	dir: './test/artifacts/out/nimble-notes-v3-linux-x64', // '/Users/davidwinter/projects/nimblenote/out/nimblenote-linux-x64',
	makeDir: './test/artifacts/make', // '/Users/davidwinter/projects/nimblenote/out/make',
	targetPlatform: 'linux'
};

const makerOptions = {
	stagePackages: ['default', 'libpcre3']
	// Icon = icon: './build/icon.png',
	// Categories = categories: ['Utility']
};

const dependencies = {
	process,
	fs
};

test.beforeEach(() => {
	fs.rmdirSync('./test/artifacts', {recursive: true});
});

test.afterEach(() => {
	fs.rmdirSync('./test/artifacts', {recursive: true});
});

test('packager setup without overrides', t => {
	const pkg = new SnapPackager({
		makeOptions,
		makerOptions,
		dependencies
	});

	t.is(pkg.values.applicationName, 'Nimble Notes v3!');
	t.is(pkg.values.version, '2.0.3');
	t.is(pkg.values.executableName, 'nimble-notes-v3');
	t.is(pkg.values.icon, path.join(process.cwd(), 'test/fixtures/icon.png'));
	t.is(pkg.values.summary, 'Simple note taking');
	t.is(pkg.values.description, 'Simple note taking');
	t.deepEqual(pkg.values.categories, []);
});

test('generation of desktop file', t => {
	const pkg = new SnapPackager({
		makeOptions,
		makerOptions,
		dependencies
	});

	t.is(pkg.generateDesktopFile(), `[Desktop Entry]
Name=Nimble Notes v3!
Exec=nimble-notes-v3
Icon=\${SNAP}/meta/gui/nimble-notes-v3.png
Type=Application
Encoding=UTF-8
`);
});

test('generation of snapcraft.yaml', t => {
	const pkg = new SnapPackager({
		makeOptions,
		makerOptions,
		dependencies
	});

	const snapYaml = yaml.safeLoad(pkg.generateSnapcraftYAML());

	t.like(snapYaml, {
		name: 'nimble-notes-v3',
		version: '2.0.3',
		icon: './snap/gui/nimble-notes-v3.png',
		summary: 'Simple note taking',
		description: 'Simple note taking',
		apps: {
			'nimble-notes-v3': {
				command: 'nimble-notes-v3/nimble-notes-v3 --no-sandbox'
			}
		},
		parts: {
			app: {
				source: './app',
				'override-build': 'cp -rv . $SNAPCRAFT_PART_INSTALL/nimble-notes-v3',
				'stage-packages': [
					'libpcre3',
					'libnss3',
					'libnspr4'
				]
			}
		}
	});

	t.true(snapYaml.apps['SNAP-TEMPLATE'] === undefined);
});

if (!process.env.FAST_TESTS) {
	test.serial('creation of snap package', async t => {
		await packager({
			dir: './test/fixtures/app',
			out: './test/artifacts/out',
			name: 'nimble-notes-v3',
			platform: 'linux',
			overwrite: true,
			quiet: true
		});

		const pkg = new SnapPackager({
			makeOptions,
			makerOptions,
			dependencies
		});

		pkg.createSnapcraftFiles();

		const destDir = path.join(makeOptions.makeDir, 'snapcraft');

		t.is(fs.readFileSync(path.join(destDir, 'snap', 'snapcraft.yaml'), 'utf8'),
			pkg.generateSnapcraftYAML());

		t.is(fs.readFileSync(path.join(destDir, 'snap', 'gui', 'nimble-notes-v3.desktop'), 'utf8'),
			pkg.generateDesktopFile());

		t.true(fs.existsSync(path.join(destDir, 'snap', 'gui', 'nimble-notes-v3.png')));

		t.true(fs.existsSync(path.join(destDir, 'app')));

		t.true(await pkg.createSnapPackage());

		t.true(fs.existsSync(path.join(
			makeOptions.makeDir, 'snapcraft', 'nimble-notes-v3_2.0.3_amd64.snap')));
	});
}
