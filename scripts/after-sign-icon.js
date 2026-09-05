const fs = require('fs/promises');
const path = require('path');
const resedit = require('resedit');

module.exports = async function afterSignIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'assets', 'icon.ico');
  const iconFile = resedit.Data.IconFile.from(await fs.readFile(iconPath));
  const executable = resedit.NtExecutable.from(await fs.readFile(exePath));
  const resource = resedit.NtExecutableResource.from(executable);
  const groups = resedit.Resource.IconGroupEntry.fromEntries(resource.entries);
  const lang = groups[0]?.lang ?? 1033;

  resedit.Resource.IconGroupEntry.replaceIconsForResource(
    resource.entries,
    1,
    lang,
    iconFile.icons.map((entry) => entry.data),
  );
  resource.outputResource(executable);
  await fs.writeFile(exePath, Buffer.from(executable.generate()));
};
