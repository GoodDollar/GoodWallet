export function throwIfQueryParamIsNull(params: { [key: string]: unknown }) {
  Object.entries(params).forEach(([name, value]) => {
    if (name == undefined || value == undefined) {
      throw new Error(`Mandatory param with name: ${name} is missing`)
    }
  })
}
