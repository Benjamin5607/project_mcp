export function ArtifactView({ artifact }) {
  if (!artifact) return null;
  return (
    <article className="artifact">
      {artifact.blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}>{block.text}</h3>;
        if (block.type === "paragraph") return <p key={index}>{block.text}</p>;
        if (block.type === "note") return <p className="note" key={index}>{block.text}</p>;
        if (block.type === "list") {
          return (
            <ul className="clean" key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "table") {
          return (
            <div className="table-wrap" key={index}>
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </article>
  );
}
