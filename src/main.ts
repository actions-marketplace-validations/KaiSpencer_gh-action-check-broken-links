import * as core from '@actions/core'
import {
  getLinkInfoFromFiles,
  collectBrokenLinks,
  createAnnotations,
} from './lib'

// https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables
interface ActionEnvironment {
  GITHUB_WORKSPACE: string
  [k: string]: unknown
}

async function run({ GITHUB_WORKSPACE }: ActionEnvironment): Promise<void> {
  try {
    const baseUrl: string = core.getInput('baseUrl', { required: true })
    const files: string[] = core
      .getInput('files')
      .split(' ')
      // Only support .mdx files at this time
      // TODO: Extend to provide support for more filetypes
      .filter((x) => x.endsWith('.mdx'))
    const whitelist: string[] = core
      .getInput('whitelist')
      .split(/\r?\n/)
      .filter(Boolean)

    const filesWithLinks = getLinkInfoFromFiles(GITHUB_WORKSPACE, files)
    core.info(`Files with links: ${JSON.stringify(filesWithLinks)}`)

    if (!filesWithLinks.length) {
      core.info('No links found in the files provided')
      return
    }

    const brokenLinks = await collectBrokenLinks(
      baseUrl,
      filesWithLinks,
      whitelist,
    )

    if (!brokenLinks.length) {
      core.info('No broken links found')
      return
    }

    const annotations = createAnnotations(brokenLinks)
    core.setOutput('annotations', annotations)
    core.setFailed(`${brokenLinks.length} broken links found!
---------

${annotations.map((x) => `Filename: ${x.path} :: ${x.message}`).join('\n')}`)
  } catch (error: unknown) {
    core.setFailed((error as { message: string }).message)
  }
}

run(process.env as ActionEnvironment)
