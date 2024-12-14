// Tree structure with values and children indices
const tree = [
    { value: "A", children: [1, 2] },
    { value: "B", children: [3, 4] },
    { value: "C", children: [] },
    { value: "D", children: [] },
    { value: "E", children: [] },
    { value: "F", children: [] },
  ];
  
  // Current index for traversal
  let currentIndex = 0;
  
  // Get references to the container and button
  const graphContainer = document.getElementById("graph-container");
  const traverseButton = document.getElementById("traverse-btn");
  
  // Function to render nodes and arrows
  function renderTree(index) {
    // Clear container and SVG
    graphContainer.innerHTML = '<svg id="arrows" width="100%" height="100%"></svg>';
    const arrowsSVG = document.getElementById("arrows");
  
    // Get the current node and its children
    const currentNode = tree[index];
    const children = currentNode.children.map((i) => tree[i]);
  
    // Render the parent node
    const parentNode = createNodeElement(currentNode.value, "center", 50);
    graphContainer.appendChild(parentNode);
  
    // Render the children nodes
    const childNodes = children.map((child, i) => {
      const xPosition = i === 0 ? "left" : "right";
      const childNode = createNodeElement(child.value, xPosition, 200);
      graphContainer.appendChild(childNode);
      return childNode;
    });
  
    // Draw arrows dynamically
    function updateArrows() {
      arrowsSVG.innerHTML = ""; // Clear arrows to redraw them
      childNodes.forEach((childNode) => {
        drawArrow(parentNode, childNode, arrowsSVG);
      });
    }
  
    // Call updateArrows initially
    updateArrows();
  
    // Ensure arrows update on window resize
    window.addEventListener("resize", updateArrows);
  }
  
  // Function to create a node element
  function createNodeElement(value, position, top) {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = value;
  
    // Position node based on tree layout
    node.style.top = `${top}px`;
    if (position === "center") {
      node.style.left = "50%";
      node.style.transform = "translate(-50%, -50%)";
    } else if (position === "left") {
      node.style.left = "25%";
      node.style.transform = "translate(-50%, -50%)";
    } else if (position === "right") {
      node.style.left = "75%";
      node.style.transform = "translate(-50%, -50%)";
    }
  
    return node;
  }
  
  // Function to draw an arrow between nodes
  function drawArrow(parentNode, childNode, svg) {
    // Get positions of parent and child nodes
    const parentRect = parentNode.getBoundingClientRect();
    const childRect = childNode.getBoundingClientRect();
    const containerRect = graphContainer.getBoundingClientRect();
  
    // Calculate start and end points relative to the container
    const startX = parentRect.left + parentRect.width / 2 - containerRect.left;
    const startY = parentRect.top + parentRect.height - containerRect.top;
    const endX = childRect.left + childRect.width / 2 - containerRect.left;
    const endY = childRect.top - containerRect.top;
  
    // Create and draw the line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", startX);
    line.setAttribute("y1", startY);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  }
  
  // Function to animate camera traversal
  function animateCamera(targetNode) {
    const containerRect = graphContainer.getBoundingClientRect();
    const nodeRect = targetNode.getBoundingClientRect();
  
    const dx = containerRect.width / 2 - (nodeRect.left + nodeRect.width / 2);
    const dy = containerRect.height / 2 - (nodeRect.top + nodeRect.height / 2);
  
    graphContainer.style.transform = `translate(${dx}px, ${dy}px)`;
    graphContainer.style.transition = "transform 0.5s ease";
  }
  
  // Function to handle traversal
  function traverseTree() {
    // Render the tree for the current index
    renderTree(currentIndex);
  
    // Move to the next node
    currentIndex = (currentIndex + 1) % tree.length;
  }
  
  // Initialize the tree with the first node
  renderTree(currentIndex);
  
  // Add event listener to the button
  traverseButton.addEventListener("click", traverseTree);
  